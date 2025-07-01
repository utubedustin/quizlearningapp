import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { QuestionService } from "../services/question.service";
import { MongoDBService } from "../services/mongodb.service";
import { Question } from "../models/question.model";
import { DialogService } from "../services/dialog.service";
import { HttpClientModule, HttpClient } from "@angular/common/http";
import { environment } from "../environments/environment";

@Component({
  selector: "app-question-management",
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="container py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Quản lý câu hỏi</h1>
        <div class="flex gap-2">
          <!-- MongoDB Connection Status -->
          <div
            class="connection-status"
            [class.connected]="mongoConfig.isConnected"
            [class.disconnected]="!mongoConfig.isConnected"
          >
            <span class="status-icon">{{
              mongoConfig.isConnected ? "🟢" : "🔴"
            }}</span>
            <span class="status-text">
              {{
                mongoConfig.isConnected
                  ? "MongoDB Connected"
                  : "MongoDB Disconnected"
              }}
            </span>
          </div>

          <button class="btn btn-secondary" (click)="openImportDialog()">
            Import JSON
          </button>
          <button class="btn btn-primary" (click)="openAddDialog()">
            Thêm câu hỏi
          </button>
        </div>
      </div>

      <div class="mb-6">
        <div class="flex gap-4 items-center flex-wrap">
          <input
            type="text"
            [(ngModel)]="searchTerm"
            (ngModelChange)="filterQuestions()"
            placeholder="Tìm kiếm câu hỏi..."
            class="input flex-1 min-w-60"
          />
          <select
            [(ngModel)]="filterCategory"
            (ngModelChange)="filterQuestions()"
            class="select"
          >
            <option value="">Tất cả danh mục</option>
            <option *ngFor="let category of categories" [value]="category">
              {{ category }}
            </option>
          </select>
        </div>
      </div>

      <div class="grid gap-4">
        <div
          *ngFor="let question of paginatedQuestions; let i = index"
          class="card"
        >
          <div class="flex justify-between items-start gap-4">
            <div class="flex-1">
              <h3 class="font-semibold mb-2">
              {{ (currentPage - 1) * pageSize + i + 1 }}. {{ question.content }}
              </h3>
              <div class="grid gap-1 mb-3">
                <div
                  *ngFor="let option of question.options; let j = index"
                  class="text-sm px-3 py-1 rounded"
                  [class.bg-success]="j === question.correctAnswer"
                  [class.text-white]="j === question.correctAnswer"
                  [class.bg-gray-100]="j !== question.correctAnswer"
                >
                  {{ getChar(65 + j) }}. {{ option }}
                </div>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="px-2 py-1 bg-gray-100 rounded">{{
                  question.category || "Chưa phân loại"
                }}</span>
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {{ question.createdAt | date : "dd/MM/yyyy" }}
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                class="btn btn-outline btn-sm"
                (click)="editQuestion(question)"
              >
                Sửa
              </button>
              <button
                class="btn btn-danger btn-sm"
                (click)="confirmDeleteQuestion(question._id)"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
            class="flex justify-center items-center gap-4 mt-4"
            *ngIf="totalPages > 1"
          >
            <button
              class="btn btn-sm"
              (click)="changePage(-1)"
              [disabled]="currentPage === 1"
            >
              ⬅️ Trước
            </button>
            <span>Trang {{ currentPage }} / {{ totalPages }}</span>
            <button
              class="btn btn-sm"
              (click)="changePage(1)"
              [disabled]="currentPage === totalPages"
            >
              Tiếp ➡️
            </button>
          </div>
      <div
        *ngIf="filteredQuestions.length === 0"
        class="text-center py-8 text-gray-500"
      >
        Không tìm thấy câu hỏi nào
      </div>
    </div>

    <!-- Add/Edit Question Dialog -->
    <div
      *ngIf="showQuestionDialog"
      class="dialog-overlay"
      (click)="closeQuestionDialog()"
    >
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2 class="text-xl font-bold">
            {{ isEditMode ? "Sửa câu hỏi" : "Thêm câu hỏi mới" }}
          </h2>
          <button class="dialog-close" (click)="closeQuestionDialog()">
            ×
          </button>
        </div>

        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">Nội dung câu hỏi</label>
            <textarea
              [(ngModel)]="questionForm.content"
              class="textarea"
              rows="3"
              placeholder="Nhập nội dung câu hỏi..."
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Các phương án trả lời</label>
            <div class="space-y-3">
              <div
                *ngFor="let option of questionForm.options; let i = index"
                class="option-row"
              >
                <div class="option-header">
                  <input
                    type="radio"
                    [name]="'correct-answer'"
                    [value]="i"
                    [(ngModel)]="questionForm.correctAnswer"
                    class="radio-input"
                  />
                  <label class="option-label"
                    >Phương án {{ getChar(65 + i) }}</label
                  >
                </div>
                <input
                  type="text"
                  [(ngModel)]="questionForm.options[i]"
                  [placeholder]="'Nhập nội dung phương án ' + getChar(65 + i)"
                  class="input"
                />
              </div>
            </div>
            <p class="form-help">Chọn radio button để đánh dấu đáp án đúng</p>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Danh mục</label>
              <input
                type="text"
                [(ngModel)]="questionForm.category"
                class="input"
                placeholder="Nhập danh mục..."
                list="categories-list"
              />
              <datalist id="categories-list">
                <option
                  *ngFor="let category of categories"
                  [value]="category"
                ></option>
              </datalist>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-outline" (click)="closeQuestionDialog()">
            Hủy
          </button>
          <button class="btn btn-primary" (click)="confirmSaveQuestion()">
            {{ isEditMode ? "Cập nhật" : "Thêm câu hỏi" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Import JSON Dialog -->
    <div
      *ngIf="showImportDialog"
      class="dialog-overlay"
      (click)="closeImportDialog()"
    >
      <div class="dialog-content dialog-lg" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2 class="text-xl font-bold">Import câu hỏi từ JSON</h2>
          <button class="dialog-close" (click)="closeImportDialog()">×</button>
        </div>

        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">Chọn file JSON</label>
            <div
              class="file-upload-area"
              [class.drag-over]="isDragOver"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              (click)="fileInput.click()"
            >
              <div class="file-upload-content">
                <div class="file-upload-icon">📄</div>
                <div class="file-upload-text">
                  <div *ngIf="!selectedFile" class="file-upload-primary">
                    Kéo thả file JSON vào đây hoặc click để chọn
                  </div>
                  <div *ngIf="selectedFile" class="file-upload-primary">
                    {{ selectedFile.name }}
                  </div>
                  <div class="file-upload-secondary">
                    Hỗ trợ định dạng JSON chuẩn đã được xử lý từ file Python
                  </div>
                </div>
              </div>
              <input
                #fileInput
                type="file"
                accept=".json"
                (change)="onFileSelected($event)"
                class="file-input-hidden"
              />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Danh mục (Category)</label>
            <select class="select" [(ngModel)]="selectedImportCategory">
              <option value="">-- Chọn danh mục --</option>
              <option value="Tin A">Tin A</option>
              <option value="Tin B">Tin B</option>
            </select>
          </div>
          <!-- Import Progress -->
          <div *ngIf="isProcessing" class="processing-status">
            <div class="processing-spinner"></div>
            <div class="processing-text">{{ processingMessage }}</div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                [style.width.%]="processingProgress"
              ></div>
            </div>
          </div>

          <!-- Import Results -->
          <div *ngIf="importResults" class="import-results">
            <h3 class="results-title">Kết quả import</h3>
            <div class="results-summary">
              <div class="result-item success">
                ✅ {{ importResults.questionsImported }} câu hỏi được thêm
              </div>
              <div
                *ngIf="importResults.duplicatesFound > 0"
                class="result-item warning"
              >
                ⚠️ {{ importResults.duplicatesFound }} câu hỏi trùng lặp
              </div>
              <div
                *ngIf="importResults.errors.length > 0"
                class="result-item error"
              >
                ❌ {{ importResults.errors.length }} lỗi xảy ra
              </div>
            </div>

            <div *ngIf="importResults.errors.length > 0" class="error-details">
              <h4 class="error-title">Chi tiết lỗi:</h4>
              <ul class="error-list">
                <li *ngFor="let error of importResults.errors">{{ error }}</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-outline" (click)="closeImportDialog()">
            {{ importResults ? "Đóng" : "Hủy" }}
          </button>
          <button
            *ngIf="!importResults"
            class="btn btn-primary"
            (click)="confirmProcessJSON()"
            [disabled]="
              !selectedFile || !selectedImportCategory || isProcessing
            "
          >
            <span *ngIf="!isProcessing">Import</span>
            <span *ngIf="isProcessing">Đang xử lý...</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .connection-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .connection-status.connected {
        background-color: #dcfce7;
        color: #166534;
      }

      .connection-status.disconnected {
        background-color: #fee2e2;
        color: #dc2626;
      }

      .status-icon {
        font-size: 0.75rem;
      }

      .dialog-lg {
        max-width: 900px;
      }

      .import-results {
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: #f9fafb;
        border-radius: 0.5rem;
      }

      .results-title {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: #374151;
      }

      .results-summary {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .result-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
      }

      .result-item.success {
        color: #059669;
      }

      .result-item.warning {
        color: #d97706;
      }

      .result-item.error {
        color: #dc2626;
      }

      .error-details {
        margin-top: 1rem;
        padding: 1rem;
        background-color: #fee2e2;
        border-radius: 0.5rem;
      }

      .error-title {
        font-weight: 600;
        color: #dc2626;
        margin-bottom: 0.5rem;
      }

      .error-list {
        list-style: disc;
        padding-left: 1.5rem;
        color: #dc2626;
        font-size: 0.875rem;
      }

      .error-list li {
        margin-bottom: 0.25rem;
      }

      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }

      .dialog-content {
        background: white;
        border-radius: 0.75rem;
        max-width: 800px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 1.5rem 0;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
      }

      .dialog-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0.25rem;
        line-height: 1;
      }

      .dialog-close:hover {
        color: #374151;
      }

      .dialog-body {
        padding: 0 1.5rem;
      }

      .dialog-footer {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        padding: 1.5rem;
        border-top: 1px solid #e5e7eb;
        margin-top: 1.5rem;
      }

      .form-group {
        margin-bottom: 1.5rem;
      }

      .form-label {
        display: block;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: #374151;
      }

      .form-help {
        font-size: 0.875rem;
        color: #6b7280;
        margin-top: 0.5rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .option-row {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
        background-color: #f9fafb;
      }

      .option-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .radio-input {
        margin: 0;
      }

      .option-label {
        font-weight: 500;
        color: #374151;
      }

      .space-y-3 > * + * {
        margin-top: 0.75rem;
      }

      .file-upload-area {
        border: 2px dashed #d1d5db;
        border-radius: 0.5rem;
        padding: 2rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .file-upload-area:hover,
      .file-upload-area.drag-over {
        border-color: #2563eb;
        background-color: #eff6ff;
      }

      .file-upload-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .file-upload-icon {
        font-size: 3rem;
      }

      .file-upload-primary {
        font-weight: 500;
        color: #374151;
      }

      .file-upload-secondary {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .file-input-hidden {
        display: none;
      }

      .processing-status {
        text-align: center;
        padding: 1.5rem;
        background-color: #f3f4f6;
        border-radius: 0.5rem;
        margin-top: 1rem;
      }

      .processing-spinner {
        width: 2rem;
        height: 2rem;
        border: 3px solid #e5e7eb;
        border-top: 3px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }

      .processing-text {
        font-weight: 500;
        color: #374151;
        margin-bottom: 1rem;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 768px) {
        .dialog-content {
          margin: 0.5rem;
          max-height: 95vh;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .dialog-footer {
          flex-direction: column-reverse;
        }

        .dialog-footer .btn {
          width: 100%;
        }
      }
    `,
  ],
})
export class QuestionManagementComponent implements OnInit {
  questions: Question[] = [];
  filteredQuestions: Question[] = [];
  categories: string[] = [];

  searchTerm = "";
  filterCategory = "";

  showQuestionDialog = false;
  showImportDialog = false;
  isEditMode = false;

  selectedFile: File | null = null;
  isProcessing = false;
  processingProgress = 0;
  processingMessage = "";
  isDragOver = false;
  importResults: any = null;

  mongoConfig = { isConnected: false };

  questionForm = {
    content: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    category: "",
  };

  editingQuestionId: string | null = null;
  selectedImportCategory: string = "";

  constructor(
    private questionService: QuestionService,
    private mongoService: MongoDBService,
    private dialogService: DialogService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.questionService.getQuestions().subscribe((questions) => {
      this.questions = questions;
      this.filteredQuestions = questions;
      this.updateCategories();
    });
    this.mongoService.testConnection().subscribe((success) => {
      if (success) {
        this.mongoConfig.isConnected = true;
      } else {
        this.mongoConfig.isConnected = false;
      }
    });
    this.mongoService.config$.subscribe((config) => {
      this.mongoConfig = config;
    });
  }
  pageSize = 10;
  currentPage = 1;

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
      correctAnswer: question.correctAnswer,
      category: question.category || "",
    };
    this.editingQuestionId = question._id;
    this.showQuestionDialog = true;
  }

  async confirmDeleteQuestion(id: string) {
    const confirmed = await this.dialogService.confirm({
      title: "Xóa câu hỏi",
      message:
        "Bạn có chắc chắn muốn xóa câu hỏi này? Hành động này không thể hoàn tác.",
      confirmText: "Xóa",
      cancelText: "Hủy",
    });

    if (confirmed) {
      this.questionService.deleteQuestion(id);
    }
  }

  async confirmSaveQuestion() {
    if (
      !this.questionForm.content.trim() ||
      this.questionForm.options.some((opt) => !opt.trim())
    ) {
      await this.dialogService.confirm({
        title: "Thông tin không đầy đủ",
        message: "Vui lòng điền đầy đủ thông tin câu hỏi và các phương án.",
        confirmText: "Đã hiểu",
        cancelText: "",
      });
      return;
    }

    const confirmed = await this.dialogService.confirm({
      title: this.isEditMode ? "Cập nhật câu hỏi" : "Thêm câu hỏi",
      message: this.isEditMode
        ? "Bạn có muốn cập nhật câu hỏi này?"
        : "Bạn có muốn thêm câu hỏi này?",
      confirmText: this.isEditMode ? "Cập nhật" : "Thêm",
      cancelText: "Hủy",
    });

    if (confirmed) {
      this.saveQuestion();
    }
  }

  saveQuestion() {
    if (this.isEditMode && this.editingQuestionId) {
      this.questionService.updateQuestion(
        this.editingQuestionId,
        this.questionForm
      );
    } else {
      this.questionService.addQuestion(this.questionForm);
    }

    this.closeQuestionDialog();
  }

  closeQuestionDialog() {
    this.showQuestionDialog = false;
    this.isEditMode = false;
    this.editingQuestionId = null;
    this.resetQuestionForm();
  }

  private resetQuestionForm() {
    this.questionForm = {
      content: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      category: "",
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
    if (file && file.type === "application/json") {
      this.selectedFile = file;
    } else {
      this.dialogService.confirm({
        title: "File không hợp lệ",
        message: "Vui lòng chọn file JSON.",
        confirmText: "Đã hiểu",
        cancelText: "",
      });
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
      if (file.type === "application/json") {
        this.selectedFile = file;
      } else {
        this.dialogService.confirm({
          title: "File không hợp lệ",
          message: "Vui lòng chọn file JSON.",
          confirmText: "Đã hiểu",
          cancelText: "",
        });
      }
    }
  }

  async confirmProcessJSON() {
    if (!this.selectedFile) return;

    const confirmed = await this.dialogService.confirm({
      title: "Import câu hỏi từ JSON",
      message: `Bạn có muốn import từ file "${this.selectedFile.name}"?`,
      confirmText: "Import",
      cancelText: "Hủy",
    });

    if (confirmed) {
      this.processJSON();
    }
  }

  async processJSON() {
    if (!this.selectedFile) return;

    this.isProcessing = true;
    this.processingProgress = 0;
    this.processingMessage = "Đang đọc file JSON...";

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const jsonText = reader.result as string;
        const parsed = JSON.parse(jsonText);
        
        for (const key in parsed) {
          if (parsed.hasOwnProperty(key)) {
            parsed[key].category = this.selectedImportCategory || "Chưa phân loại";
          }
        }
        
        this.processingProgress = 20;
        this.processingMessage = "Đang gửi dữ liệu đến server...";

        // Send JSON data to backend API
        const response = await this.http
          .post<any>(`${environment.api.baseUrl}/questions/import-json`, parsed)
          .toPromise();

        this.processingProgress = 80;
        this.processingMessage = "Đang xử lý phản hồi từ server...";

        // Log response for debugging
        console.log("API Response:", response);

        // Ensure questionsImported is an array
        let questionsImported: any[] = [];
        if (Array.isArray(response.questionsImported)) {
          questionsImported = response.questionsImported;
        } else if (
          response.questionsImported &&
          typeof response.questionsImported === "object"
        ) {
          // Handle object format (e.g., from Python script)
          questionsImported = Object.values(response.questionsImported).flatMap(
            (q: any) =>
              Object.entries(q).map(([key, value]: [string, any]) => ({
                id: key,
                content: value[0]?.[5] || "", // Extract content from Python JSON
                options:
                  response.answers?.[key]?.options?.map((opt: any) => opt[5]) ||
                  [],
                correctAnswer: response.correct_options?.[key]
                  ? response.answers?.[key]?.options?.findIndex(
                      (opt: any) => opt[5] === response.correct_options[key]
                    )
                  : 0,
                category: this.selectedImportCategory || "Chưa phân loại",
                createdAt: new Date(),
              }))
          );
        } else {
          console.error("Invalid questionsImported format:", questionsImported);
          throw new Error("questionsImported is not in a valid format");
        }

        // Update questions list
        this.questions = [...this.questions, ...questionsImported];
        this.filteredQuestions = this.questions;
        this.updateCategories();

        this.processingProgress = 100;
        this.processingMessage = "Hoàn thành!";
        this.importResults = {
          questionsImported: questionsImported.length,
          duplicatesFound: response.duplicatesFound || 0,
          errors: response.errors || [],
        };
      } catch (error: any) {
        console.error("Import Error:", error);
        await this.dialogService.confirm({
          title: "Lỗi import",
          message:
            error.message || "Không thể import file JSON. Vui lòng thử lại.",
          confirmText: "Đóng",
          cancelText: "",
        });
      } finally {
        this.isProcessing = false;
      }
    };
    reader.onerror = async () => {
      await this.dialogService.confirm({
        title: "Lỗi đọc file",
        message: "Không thể đọc file JSON. Vui lòng thử lại.",
        confirmText: "Đóng",
        cancelText: "",
      });
      this.isProcessing = false;
    };
    reader.readAsText(this.selectedFile);
  }

  getChar(code: number): string {
    return String.fromCharCode(code);
  }
}
