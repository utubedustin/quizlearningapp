import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { QuestionService } from "../../services/question.service";
import { QuizSet, QuizResult, Question } from "../../models/question.model";
import { DialogService } from "../../services/dialog.service";
import { LoadingService } from "../../services/loading.service";

@Component({
  selector: "app-study",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./study.component.html",
  styleUrls: ["./study.component.css"],
})
export class StudyComponent implements OnInit {
  studySets: QuizSet[] = [];
  filteredStudySets: QuizSet[] = [];
  studyResults: QuizResult[] = [];
  isLoading = false;
  loadingStates: { [key: string]: boolean } = {};
  wrongAnswersSetExists: boolean = false;
  
  // Category filtering
  availableCategories: string[] = [];
  selectedCategories: Set<string> = new Set();

  // Pagination
  currentPage = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50];

  constructor(
    private questionService: QuestionService,
    public router: Router,
    private dialogService: DialogService,
    private loadingService: LoadingService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  get totalPages() {
    return Math.ceil(this.filteredStudySets.length / this.pageSize);
  }

  get paginatedStudySets() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredStudySets.slice(start, start + this.pageSize);
  }

  changePage(delta: number) {
    const newPage = this.currentPage + delta;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  private updatePagination() {
    // Apply category filters
    if (this.selectedCategories.size > 0) {
      this.filteredStudySets = this.studySets.filter(set => {
        // Special handling for wrong answers set
        if (set._id === 'wrong-answers-set') {
          return this.selectedCategories.has('Câu hỏi sai');
        }
        
        // Check if any question in the set matches selected categories
        return set.questions.some(question => 
          question.category && this.selectedCategories.has(question.category)
        );
      });
    } else {
      this.filteredStudySets = [...this.studySets];
    }
    
    // Reset to first page when filtering
    this.currentPage = 1;
  }

  private loadData() {
    this.isLoading = true;
    this.loadingService.show("Đang tải dữ liệu học bài...");

    // Load study sets
    this.questionService.getQuestions().subscribe((questions) => {
      console.log("Questions loaded for study sets:", questions.length);
      this.studySets = this.questionService.createStudySets();
      this.wrongAnswersSetExists = this.studySets.some(set => set._id === 'wrong-answers-set');
      this.extractCategories(questions);
      this.updatePagination();
      console.log("Study sets created:", this.studySets.length);
      this.isLoading = false;
      this.loadingService.hide();
    });

    // Load study results
    this.questionService.getQuizResults().subscribe((results) => {
      console.log("All quiz results loaded:", results.length);
      this.studyResults = results.filter((r) => r.mode === "study");
      console.log("Study results filtered:", this.studyResults.length);
    });

    // Listen for wrong answers changes to update study sets
    this.questionService.getWrongAnswers().subscribe((wrongAnswers) => {
      console.log("Wrong answers updated:", wrongAnswers.length);
      this.studySets = this.questionService.createStudySets();
      this.wrongAnswersSetExists = this.studySets.some(set => set._id === 'wrong-answers-set');
      this.updatePagination();
    });
  }

  private extractCategories(questions: Question[]) {
    const categorySet = new Set<string>();
    questions.forEach(question => {
      if (question.category && question.category.trim()) {
        categorySet.add(question.category);
      }
    });
    this.availableCategories = Array.from(categorySet).sort();
  }

  // Category filter methods
  toggleCategoryFilter(category: string) {
    if (this.selectedCategories.has(category)) {
      this.selectedCategories.delete(category);
    } else {
      this.selectedCategories.add(category);
    }
    this.updatePagination();
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategories.has(category);
  }

  clearAllFilters() {
    this.selectedCategories.clear();
    this.updatePagination();
  }

  get hasActiveFilters(): boolean {
    return this.selectedCategories.size > 0;
  }

  getSetResult(setId: string): QuizResult | undefined {
    const result = this.studyResults.find((r) => {
      console.log(
        "Checking result:",
        r.quizSetId,
        "against",
        setId,
        "match:",
        r.quizSetId === setId
      );
      return r.quizSetId === setId;
    });
    console.log(`Result for ${setId}:`, result);
    return result;
  }

  getCategories(set: QuizSet): string[] {
    if (set._id === 'wrong-answers-set') {
      return ['Câu hỏi sai'];
    }

    const categories = set.questions
      .map((q) => q.category)
      .filter(Boolean)
      .filter((cat, index, arr) => arr.indexOf(cat) === index);

    return categories.length > 0
      ? (categories as string[])
      : ["Chưa phân loại"];
  }

  // Check if set has incorrect answers (score < 100%)
  hasIncorrectAnswers(setId: string): boolean {
    const result = this.getSetResult(setId);
    return result ? result.score < 1.0 : false;
  }

  // Get incorrect questions from a specific set result
  getIncorrectQuestions(setId: string): string[] {
    const result = this.getSetResult(setId);
    if (!result) return [];

    const incorrectQuestionIds: string[] = [];
    
    for (let i = 0; i < result.questions.length; i++) {
      const userAnswer = result.userAnswers[i];
      const question = result.questions[i];
      
      // Check if answer is incorrect (not null and not correct)
      if (userAnswer !== null && !this.isAnswerCorrect(userAnswer, question.correctAnswer)) {
        incorrectQuestionIds.push(question._id);
      }
    }
    
    return incorrectQuestionIds;
  }

  // Check if user's answer is correct
  private isAnswerCorrect(userAnswer: number | number[] | null, correctAnswer: number | number[]): boolean {
    if (userAnswer === null) return false;
    
    if (Array.isArray(correctAnswer)) {
      // Multiple choice question
      if (!Array.isArray(userAnswer)) return false;
      
      // Check if arrays have same length and same elements
      if (userAnswer.length !== correctAnswer.length) return false;
      
      const sortedUser = [...userAnswer].sort();
      const sortedCorrect = [...correctAnswer].sort();
      
      return sortedUser.every((val, index) => val === sortedCorrect[index]);
    } else {
      // Single choice question
      return userAnswer === correctAnswer;
    }
  }

  startStudySet(set: QuizSet) {
    this.setLoadingState(set._id, true);
    
    setTimeout(() => {
      this.router.navigate(["/quiz"], {
        queryParams: {
          mode: "study",
          setId: set._id,
          questions: JSON.stringify(set.questions.map((q) => q._id)),
        },
      });
      this.setLoadingState(set._id, false);
    }, 500);
  }

  reviewStudySet(set: QuizSet) {
    this.setLoadingState(`${set._id}-review`, true);
    
    const result = this.getSetResult(set._id);
    if (!result) {
      this.setLoadingState(`${set._id}-review`, false);
      return;
    }

    setTimeout(() => {
      // Navigate to results view with the specific result data
      this.router.navigate(["/quiz"], {
        queryParams: {
          mode: "review",
          setId: set._id,
          questions: JSON.stringify(set.questions.map((q) => q._id)),
          resultId: result.id,
        },
      });
      this.setLoadingState(`${set._id}-review`, false);
    }, 300);
  }

  async confirmRetakeStudySet(set: QuizSet) {
    const isWrongAnswersSet = set._id === 'wrong-answers-set';
    const title = isWrongAnswersSet ? "Học lại câu sai" : "Làm lại bài học";
    const message = isWrongAnswersSet 
      ? `Bạn có chắc chắn muốn học lại các câu sai?\n\nCác câu trả lời đúng sẽ được loại bỏ khỏi đề này.`
      : `Bạn có chắc chắn muốn làm lại "${set.name}"?\n\nKết quả hiện tại sẽ bị xóa và bạn sẽ bắt đầu làm bài từ đầu.`;

    const confirmed = await this.dialogService.confirm({
      title,
      message,
      confirmText: "Làm lại",
      cancelText: "Hủy",
    });

    if (confirmed) {
      this.setLoadingState(`${set._id}-retake`, true);
      
      // Clear the previous result and any saved progress
      this.questionService.clearStudySetResult(set._id);

      setTimeout(() => {
        // Navigate with retake flag to ensure fresh start
        this.router.navigate(["/quiz"], {
          queryParams: {
            mode: "study",
            setId: set._id,
            questions: JSON.stringify(set.questions.map((q) => q._id)),
            retake: "true"
          },
        });
        this.setLoadingState(`${set._id}-retake`, false);
      }, 500);
    }
  }

  // Retake only incorrect answers from a study set
  async retakeIncorrectAnswers(set: QuizSet) {
    const incorrectQuestionIds = this.getIncorrectQuestions(set._id);
    
    if (incorrectQuestionIds.length === 0) {
      return; // No incorrect answers to retake
    }

    const confirmed = await this.dialogService.confirm({
      title: "Làm lại các câu sai",
      message: `Bạn có muốn làm lại ${incorrectQuestionIds.length} câu đã trả lời sai trong "${set.name}"?\n\nChỉ các câu sai sẽ được hiển thị.`,
      confirmText: "Làm lại câu sai",
      cancelText: "Hủy",
    });

    if (confirmed) {
      this.setLoadingState(`${set._id}-incorrect`, true);
      
      setTimeout(() => {
        // Navigate to quiz with only incorrect questions
        this.router.navigate(["/quiz"], {
          queryParams: {
            mode: "study",
            setId: set._id + '-incorrect',
            questions: JSON.stringify(incorrectQuestionIds),
            retake: "true"
          },
        });
        this.setLoadingState(`${set._id}-incorrect`, false);
      }, 300);
    }
  }

  async confirmClearWrongAnswers() {
    const confirmed = await this.dialogService.confirm({
      title: "Xóa đề câu hỏi sai",
      message: "Bạn có chắc chắn muốn xóa toàn bộ đề 'Học lại câu sai'?\n\nHành động này không thể hoàn tác.",
      confirmText: "Xóa",
      cancelText: "Hủy",
    });

    if (confirmed) {
      this.setLoadingState('wrong-answers-set-clear', true);
      
      setTimeout(() => {
        this.questionService.clearWrongAnswers();
        this.questionService.clearStudySetResult('wrong-answers-set');
        
        // Refresh study sets
        this.studySets = this.questionService.createStudySets();
        this.updatePagination();
        this.setLoadingState('wrong-answers-set-clear', false);
      }, 500);
    }
  }

  private setLoadingState(key: string, loading: boolean) {
    this.loadingStates[key] = loading;
  }

  isButtonLoading(key: string): boolean {
    return this.loadingStates[key] || false;
  }
}