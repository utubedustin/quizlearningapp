import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuestionService } from '../../services/question.service';
import { MongoDBService } from '../../services/mongodb.service';
import { Question } from '../../models/question.model';
import { DialogService } from '../../services/dialog.service';
import { LoadingService } from '../../services/loading.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-question-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './question-management.component.html',
  styleUrls: ['./question-management.component.css'],
})
export class QuestionManagementComponent implements OnInit {
  questions: Question[] = [];
  filteredQuestions: Question[] = [];
  categories: string[] = [];

  searchTerm = '';
  filterCategory = '';

  showQuestionDialog = false;
  showImportDialog = false;
  isEditMode = false;
  isSaving = false;

  selectedFile: File | null = null;
  isProcessing = false;
  processingProgress = 0;
  processingMessage = '';
  isDragOver = false;
  importResults: any = null;

  mongoConfig = { isConnected: false };

  // Toast notification
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  questionForm = {
    content: '',
    options: ['', '', '', ''],
    correctAnswer: 0 as number | number[],
    category: '',
    type: 'single' as 'single' | 'multiple',
  };

  editingQuestionId: string | null = null;
  selectedImportCategory: string = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50];

  constructor(
    private questionService: QuestionService,
    private mongoService: MongoDBService,
    private dialogService: DialogService,
    private loadingService: LoadingService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadQuestions();
    this.checkMongoConnection();
  }

  get totalPages() {
    return Math.ceil(this.filteredQuestions.length / this.pageSize);
  }

  get paginatedQuestions() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredQuestions.slice(start, start + this.pageSize);
  }

  changePage(delta: number) {
    const newPage = this.currentPage + delta;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.filterQuestions();
  }

  private loadQuestions() {
    this.loadingService.show('Đang tải câu hỏi...');

    this.questionService.getQuestions().subscribe({
      next: (questions) => {
        this.questions = questions;
        this.filteredQuestions = questions;
        this.updateCategories();
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading questions:', error);
        this.showToastMessage('Lỗi khi tải câu hỏi', 'error');
        this.loadingService.hide();
      },
    });
  }

  private checkMongoConnection() {
    this.mongoService.testConnection().subscribe({
      next: (success) => {
        this.mongoConfig.isConnected = success;
      },
      error: () => {
        this.mongoConfig.isConnected = false;
      },
    });

    this.mongoService.config$.subscribe((config) => {
      this.mongoConfig = config;
    });
  }

  private showToastMessage(
    message: string,
    type: 'success' | 'error' = 'success'
  ) {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    // Auto hide after 3 seconds
    setTimeout(() => {
      this.hideToast();
    }, 3000);
  }

  hideToast() {
    this.showToast = false;
  }

  // Check if question is single choice
  isSingleChoice(question: Question): boolean {
    return typeof question.correctAnswer === 'number';
  }

  // Check if an option is correct
  isCorrectOption(
    optionIndex: number,
    correctAnswer: number | number[]
  ): boolean {
    if (Array.isArray(correctAnswer)) {
      return correctAnswer.includes(optionIndex);
    } else {
      return correctAnswer === optionIndex;
    }
  }

  // Check if correct answer is selected in form
  isCorrectAnswerSelected(optionIndex: number): boolean {
    if (Array.isArray(this.questionForm.correctAnswer)) {
      return this.questionForm.correctAnswer.includes(optionIndex);
    }
    return false;
  }

  // Handle question type change
  onQuestionTypeChange() {
    if (this.questionForm.type === 'single') {
      this.questionForm.correctAnswer = 0;
    } else {
      this.questionForm.correctAnswer = [];
    }
  }

  // Handle correct answer change for multiple choice
  onCorrectAnswerChange(optionIndex: number, event: any) {
    if (this.questionForm.type === 'multiple') {
      let correctAnswers = Array.isArray(this.questionForm.correctAnswer)
        ? [...this.questionForm.correctAnswer]
        : [];

      if (event.target.checked) {
        if (!correctAnswers.includes(optionIndex)) {
          correctAnswers.push(optionIndex);
        }
      } else {
        correctAnswers = correctAnswers.filter(
          (index) => index !== optionIndex
        );
      }

      this.questionForm.correctAnswer = correctAnswers;
    }
  }

  // Add new option
  addOption() {
    if (this.questionForm.options.length < 6) {
      this.questionForm.options.push('');
    }
  }

  // Remove option - Fixed TypeScript error
  removeOption(index: number) {
    if (this.questionForm.options.length > 2) {
      this.questionForm.options.splice(index, 1);

      // Adjust correct answers if needed
      if (this.questionForm.type === 'single') {
        // Type guard to ensure correctAnswer is a number
        if (typeof this.questionForm.correctAnswer === 'number') {
          if (this.questionForm.correctAnswer >= index) {
            this.questionForm.correctAnswer = Math.max(
              0,
              this.questionForm.correctAnswer - 1
            );
          }
        }
      } else {
        if (Array.isArray(this.questionForm.correctAnswer)) {
          this.questionForm.correctAnswer = this.questionForm.correctAnswer
            .filter((ans) => ans !== index)
            .map((ans) => (ans > index ? ans - 1 : ans));
        }
      }
    }
  }

  private updateCategories() {
    const categorySet = new Set(
      this.questions.map((q) => q.category).filter(Boolean)
    );
    this.categories = Array.from(categorySet) as string[];
  }

  filterQuestions() {
    this.filteredQuestions = this.questions.filter((question) => {
      const matchesSearch =
        question.content
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        question.options.some((option) =>
          option.toLowerCase().includes(this.searchTerm.toLowerCase())
        );

      const matchesCategory =
        !this.filterCategory || question.category === this.filterCategory;

      return matchesSearch && matchesCategory;
    });
    this.currentPage = 1; // Reset to first page when filtering
  }

  openAddDialog() {
    this.isEditMode = false;
    this.resetQuestionForm();
    this.showQuestionDialog = true;
  }

  editQuestion(question: Question) {
    this.isEditMode = true;
    this.questionForm = {
      content: question.content,
      options: [...question.options],
      correctAnswer: Array.isArray(question.correctAnswer)
        ? [...question.correctAnswer]
        : question.correctAnswer,
      category: question.category || '',
      type: Array.isArray(question.correctAnswer) ? 'multiple' : 'single',
    };
    this.editingQuestionId = question._id;
    this.showQuestionDialog = true;
  }

  async confirmDeleteQuestion(id: string) {
    const confirmed = await this.dialogService.confirm({
      title: 'Xóa câu hỏi',
      message:
        'Bạn có chắc chắn muốn xóa câu hỏi này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });

    if (confirmed) {
      this.loadingService.show('Đang xóa câu hỏi...');

      try {
        this.questionService.deleteQuestion(id);
        this.showToastMessage('Xóa câu hỏi thành công!', 'success');

        // Refresh questions list after deletion
        setTimeout(() => {
          this.loadQuestions();
        }, 500);
      } catch (error) {
        console.error('Error deleting question:', error);
        this.showToastMessage('Lỗi khi xóa câu hỏi', 'error');
        this.loadingService.hide();
      }
    }
  }

  async confirmSaveQuestion() {
    // Validation
    if (!this.questionForm.content.trim()) {
      this.showToastMessage('Vui lòng nhập nội dung câu hỏi', 'error');
      return;
    }

    if (this.questionForm.options.some((opt) => !opt.trim())) {
      this.showToastMessage(
        'Vui lòng điền đầy đủ các phương án trả lời',
        'error'
      );
      return;
    }

    // Validate correct answers
    if (this.questionForm.type === 'multiple') {
      if (
        !Array.isArray(this.questionForm.correctAnswer) ||
        this.questionForm.correctAnswer.length === 0
      ) {
        this.showToastMessage('Vui lòng chọn ít nhất một đáp án đúng', 'error');
        return;
      }
    }

    const confirmed = await this.dialogService.confirm({
      title: this.isEditMode ? 'Cập nhật câu hỏi' : 'Thêm câu hỏi',
      message: this.isEditMode
        ? 'Bạn có muốn cập nhật câu hỏi này?'
        : 'Bạn có muốn thêm câu hỏi này?',
      confirmText: this.isEditMode ? 'Cập nhật' : 'Thêm',
      cancelText: 'Hủy',
    });

    if (confirmed) {
      this.saveQuestion();
    }
  }

  saveQuestion() {
    this.isSaving = true;

    const questionData = {
      content: this.questionForm.content.trim(),
      options: this.questionForm.options
        .map((opt) => opt.trim())
        .filter((opt) => opt),
      correctAnswer: this.questionForm.correctAnswer,
      category: this.questionForm.category.trim(),
    };

    try {
      if (this.isEditMode && this.editingQuestionId) {
        this.questionService.updateQuestion(
          this.editingQuestionId,
          questionData
        );
        this.showToastMessage('Cập nhật câu hỏi thành công!', 'success');
      } else {
        this.questionService.addQuestion(questionData);
        this.showToastMessage('Thêm câu hỏi thành công!', 'success');
      }

      this.closeQuestionDialog();

      // Refresh questions list after save to get updated data
      setTimeout(() => {
        this.loadQuestions();
      }, 500);
    } catch (error) {
      console.error('Error saving question:', error);
      this.showToastMessage('Lỗi khi lưu câu hỏi', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  closeQuestionDialog() {
    this.showQuestionDialog = false;
    this.isEditMode = false;
    this.editingQuestionId = null;
    this.isSaving = false;
    this.resetQuestionForm();
  }

  private resetQuestionForm() {
    this.questionForm = {
      content: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      category: '',
      type: 'single',
    };
  }

  openImportDialog() {
    this.showImportDialog = true;
    this.selectedFile = null;
    this.isProcessing = false;
    this.processingProgress = 0;
    this.importResults = null;
  }

  closeImportDialog() {
    this.showImportDialog = false;
    this.selectedFile = null;
    this.isProcessing = false;
    this.processingProgress = 0;
    this.isDragOver = false;
    this.importResults = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      this.selectedFile = file;
    } else {
      this.showToastMessage('Vui lòng chọn file JSON hợp lệ', 'error');
      this.selectedFile = null;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json') {
        this.selectedFile = file;
      } else {
        this.showToastMessage('Vui lòng chọn file JSON hợp lệ', 'error');
      }
    }
  }

  async confirmProcessJSON() {
    if (!this.selectedFile) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Import câu hỏi từ JSON',
      message: `Bạn có muốn import từ file "${this.selectedFile.name}"?`,
      confirmText: 'Import',
      cancelText: 'Hủy',
    });

    if (confirmed) {
      this.processJSON();
    }
  }

  async processJSON() {
    if (!this.selectedFile) return;

    this.isProcessing = true;
    this.processingProgress = 0;
    this.processingMessage = 'Đang đọc file JSON...';

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const jsonText = reader.result as string;
        const parsed = JSON.parse(jsonText);

        for (const key in parsed) {
          if (parsed.hasOwnProperty(key)) {
            parsed[key].category =
              this.selectedImportCategory || 'Chưa phân loại';
          }
        }

        this.processingProgress = 20;
        this.processingMessage = 'Đang gửi dữ liệu đến server...';

        // Send JSON data to backend API
        const response = await this.http
          .post<any>(`${environment.api.baseUrl}/questions/import-json`, parsed)
          .toPromise();

        this.processingProgress = 80;
        this.processingMessage = 'Đang xử lý phản hồi từ server...';

        // Log response for debugging
        console.log('API Response:', response);

        // API trả về addedCount thay vì questionsImported
        const addedCount = response.addedCount || 0;

        this.processingProgress = 100;
        this.processingMessage = 'Hoàn thành!';
        this.importResults = {
          questionsImported: addedCount,
          errors: response.errors || [],
        };

        this.showToastMessage(
          `Import thành công ${addedCount} câu hỏi!`,
          'success'
        );

        // Refresh questions list after import
        setTimeout(() => {
          this.loadQuestions();
        }, 1000);
      } catch (error: any) {
        console.error('Import Error:', error);
        this.showToastMessage('Lỗi khi import file JSON', 'error');
        this.importResults = {
          questionsImported: 0,
          errors: [error.message || 'Không thể import file JSON'],
        };
      } finally {
        this.isProcessing = false;
      }
    };

    reader.onerror = () => {
      this.showToastMessage('Không thể đọc file JSON', 'error');
      this.isProcessing = false;
    };

    reader.readAsText(this.selectedFile);
  }

  getChar(code: number): string {
    return String.fromCharCode(code);
  }
}
