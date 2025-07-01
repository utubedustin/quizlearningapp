import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionService } from '../services/question.service';
import { Question } from '../models/question.model';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="quiz-container" *ngIf="!showResults">
      <!-- Header -->
      <div class="quiz-header">
        <div class="quiz-title">
          <h1 class="text-xl md:text-2xl font-bold">
            {{ mode === 'study' ? 'Học bài' : 'Luyện thi' }}
          </h1>
          <p class="text-gray-600 text-sm md:text-base">
            Câu {{ currentQuestionIndex + 1 }} / {{ questions.length }}
          </p>
        </div>
        
        <div class="quiz-controls">
          <div *ngIf="timeLimit > 0 && mode === 'practice'" class="timer"
               [class.warning]="remainingTime <= 300 && remainingTime > 60"
               [class.danger]="remainingTime <= 60">
            ⏱️ {{ formatTime(remainingTime) }}
          </div>
          <button class="btn btn-outline btn-sm" (click)="saveAndExit()">
            Lưu và thoát
          </button>
        </div>
      </div>

      <!-- Fixed Timer for Mobile Practice Mode -->
      <div *ngIf="timeLimit > 0 && mode === 'practice' && isMobile" 
           class="fixed-timer"
           [class.fixed-timer-visible]="isTimerFixed"
           [class.warning]="remainingTime <= 300 && remainingTime > 60"
           [class.danger]="remainingTime <= 60">
        ⏱️ {{ formatTime(remainingTime) }}
      </div>

      <!-- Progress Bar -->
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" 
               [style.width.%]="completionPercentage">
          </div>
        </div>
        <div class="progress-text">
          Hoàn thành: {{ completionPercentage | number:'1.0-0' }}%
        </div>
      </div>

      <!-- Question List (Mobile - Top) -->
      <div class="question-list-mobile">
        <h3 class="question-list-title">Danh sách câu hỏi</h3>
        <div class="question-grid-mobile">
          <button *ngFor="let question of questions; let i = index"
                  class="question-item"
                  [class.current]="i === currentQuestionIndex"
                  [class.answered]="userAnswers[i] !== null && i !== currentQuestionIndex"
                  [class.unanswered]="userAnswers[i] === null && i !== currentQuestionIndex"
                  (click)="goToQuestion(i)">
            {{ i + 1 }}
          </button>
        </div>
        <div class="question-legend">
          <div class="legend-item">
            <div class="legend-color current"></div>
            <span>Hiện tại</span>
          </div>
          <div class="legend-item">
            <div class="legend-color answered"></div>
            <span>Đã trả lời</span>
          </div>
          <div class="legend-item">
            <div class="legend-color unanswered"></div>
            <span>Chưa trả lời</span>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="quiz-main">
        <!-- Question List (Desktop - Sidebar) -->
        <div class="question-sidebar">
          <div class="sidebar-header">
            <h3 class="sidebar-title">Danh sách câu hỏi</h3>
            <div *ngIf="timeLimit > 0 && mode === 'study'" class="timer timer-sidebar"
                 [class.warning]="remainingTime <= 300 && remainingTime > 60"
                 [class.danger]="remainingTime <= 60">
              ⏱️ {{ formatTime(remainingTime) }}
            </div>
          </div>
          
          <div class="question-grid">
            <button *ngFor="let question of questions; let i = index"
                    class="question-item"
                    [class.current]="i === currentQuestionIndex"
                    [class.answered]="userAnswers[i] !== null && i !== currentQuestionIndex"
                    [class.unanswered]="userAnswers[i] === null && i !== currentQuestionIndex"
                    (click)="goToQuestion(i)">
              {{ i + 1 }}
            </button>
          </div>
          
          <div class="question-legend">
            <div class="legend-item">
              <div class="legend-color current"></div>
              <span>Hiện tại</span>
            </div>
            <div class="legend-item">
              <div class="legend-color answered"></div>
              <span>Đã trả lời</span>
            </div>
            <div class="legend-item">
              <div class="legend-color unanswered"></div>
              <span>Chưa trả lời</span>
            </div>
          </div>
        </div>

        <!-- Question Content -->
        <div class="question-content">
          <div *ngIf="currentQuestion" class="question-card">
            <h2 class="question-title">
              {{ currentQuestion.content }}
            </h2>
            
            <div class="options-list">
              <label *ngFor="let option of currentQuestion.options; let i = index" 
                     class="option-item"
                     [class.selected]="userAnswers[currentQuestionIndex] === i">
                <input 
                  type="radio" 
                  [name]="'question-' + currentQuestionIndex" 
                  [value]="i"
                  [(ngModel)]="userAnswers[currentQuestionIndex]"
                  (change)="autoSave()"
                  class="option-radio"
                >
                <span class="option-content">
                  <strong class="option-letter">{{ getChar(65 + i) }}.</strong> 
                  <span class="option-text">{{ option }}</span>
                </span>
              </label>
            </div>
            
            <div class="navigation-buttons">
              <button 
                class="btn btn-outline" 
                (click)="previousQuestion()"
                [disabled]="currentQuestionIndex === 0"
              >
                ← Câu trước
              </button>
              
              <div class="nav-right">
                <button 
                  *ngIf="currentQuestionIndex < questions.length - 1 && completionPercentage !== 100"
                  class="btn btn-primary" 
                  (click)="nextQuestion()"
                >
                  Câu tiếp →
                </button>
                
                <button 
                  *ngIf="completionPercentage === 100"
                  class="btn btn-secondary" 
                  (click)="finishQuiz()"
                >
                  Hoàn thành
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Results Screen -->
    <div class="container py-8" *ngIf="showResults">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-4">Kết quả bài làm</h1>
        <div class="text-6xl mb-4"
             [class.text-success]="score >= 0.8"
             [class.text-warning]="score >= 0.5 && score < 0.8"
             [class.text-error]="score < 0.5">
          {{ (score * 100) | number:'1.0-0' }}%
        </div>
        <div class="text-xl font-semibold mb-2">
          {{ correctAnswers }} / {{ questions.length }} câu đúng
        </div>
        <div class="text-gray-600">
          Thời gian làm bài: {{ formatTime(timeSpent) }}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="card text-center">
          <div class="text-2xl font-bold text-success mb-2">{{ correctAnswers }}</div>
          <div class="text-gray-600">Câu đúng</div>
        </div>
        <div class="card text-center">
          <div class="text-2xl font-bold text-error mb-2">{{ questions.length - correctAnswers }}</div>
          <div class="text-gray-600">Câu sai</div>
        </div>
        <div class="card text-center">
          <div class="text-2xl font-bold text-warning mb-2">{{ unansweredCount }}</div>
          <div class="text-gray-600">Chưa trả lời</div>
        </div>
      </div>

      <div class="card mb-6">
        <h2 class="text-lg font-semibold mb-4">Chi tiết từng câu</h2>
        <div class="space-y-4">
          <div *ngFor="let question of questions; let i = index" 
               class="border rounded-lg p-4"
               [class.border-success]="userAnswers[i] === question.correctAnswer"
               [class.bg-green-50]="userAnswers[i] === question.correctAnswer"
               [class.border-error]="userAnswers[i] !== null && userAnswers[i] !== question.correctAnswer"
               [class.bg-red-50]="userAnswers[i] !== null && userAnswers[i] !== question.correctAnswer"
               [class.border-warning]="userAnswers[i] === null"
               [class.bg-yellow-50]="userAnswers[i] === null">
            
            <div class="flex items-start gap-3 mb-3">
              <div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                   [class.bg-success]="userAnswers[i] === question.correctAnswer"
                   [class.text-white]="userAnswers[i] === question.correctAnswer"
                   [class.bg-error]="userAnswers[i] !== null && userAnswers[i] !== question.correctAnswer"
                   [class.text-white]="userAnswers[i] !== null && userAnswers[i] !== question.correctAnswer"
                   [class.bg-warning]="userAnswers[i] === null"
                   [class.text-white]="userAnswers[i] === null">
                {{ i + 1 }}
              </div>
              <div class="flex-1">
                <h4 class="font-medium mb-2">{{ question.content }}</h4>
                <div class="space-y-1">
                  <div *ngFor="let option of question.options; let j = index" 
                       class="text-sm px-2 py-1 rounded"
                       [class.bg-success]="j === question.correctAnswer"
                       [class.text-white]="j === question.correctAnswer"
                       [class.bg-error]="j === userAnswers[i] && j !== question.correctAnswer"
                       [class.text-white]="j === userAnswers[i] && j !== question.correctAnswer">
                    {{ getChar(65 + j) }}. {{ option }}
                    <span *ngIf="j === question.correctAnswer" class="ml-2">✓ Đáp án đúng</span>
                    <span *ngIf="j === userAnswers[i] && j !== question.correctAnswer" class="ml-2">✗ Bạn chọn</span>
                  </div>
                </div>
                <div *ngIf="userAnswers[i] === null" class="text-warning text-sm mt-2">
                  Chưa trả lời
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center">
        <button class="btn btn-primary mr-3" (click)="goHome()">
          Về trang chủ
        </button>
        <button class="btn btn-outline" (click)="retakeQuiz()">
          Làm lại
        </button>
      </div>
    </div>
  `,
  styles: [`
    .quiz-container {
      min-height: 100vh;
      background-color: #f8fafc;
    }

    .quiz-header {
      background: white;
      padding: 1rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .quiz-title h1 {
      margin: 0;
    }

    .quiz-title p {
      margin: 0;
    }

    .quiz-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .fixed-timer {
      position: fixed;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-weight: 600;
      font-size: 0.875rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .fixed-timer-visible {
      top: 10px;
    }

    .fixed-timer.warning {
      background-color: #fef3c7;
      border-color: #f59e0b;
      color: #92400e;
    }

    .fixed-timer.danger {
      background-color: #fee2e2;
      border-color: #ef4444;
      color: #dc2626;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.05); }
    }

    .progress-section {
      background: white;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .progress-text {
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 0.5rem;
    }

    .question-list-mobile {
      display: none;
      background: white;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .question-list-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #374151;
    }

    .quiz-main {
      display: flex;
      min-height: calc(100vh - 200px);
    }

    .question-sidebar {
      width: 20%;
      background: white;
      border-right: 1px solid #e5e7eb;
      padding: 1.5rem;
      overflow-y: auto;
    }

    .sidebar-header {
      margin-bottom: 1.5rem;
    }

    .sidebar-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #374151;
    }

    .timer-sidebar {
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
    }

    .question-grid,
    .question-grid-mobile {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .question-grid-mobile {
      grid-template-columns: repeat(auto-fill, minmax(35px, 1fr));
      gap: 0.375rem;
      margin-bottom: 1rem;
    }

    .question-item {
      width: 40px;
      height: 40px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .question-grid-mobile .question-item {
      width: 35px;
      height: 35px;
      font-size: 0.75rem;
    }

    .question-item.current {
      background-color: #2563eb;
      border-color: #2563eb;
      color: white;
      transform: scale(1.1);
    }

    .question-item.answered {
      background-color: #10b981;
      border-color: #10b981;
      color: white;
    }

    .question-item.unanswered {
      background-color: white;
      border-color: #d1d5db;
      color: #6b7280;
    }

    .question-item:hover:not(.current) {
      border-color: #2563eb;
      transform: translateY(-1px);
    }

    .question-legend {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 2px solid;
    }

    .legend-color.current {
      background-color: #2563eb;
      border-color: #2563eb;
    }

    .legend-color.answered {
      background-color: #10b981;
      border-color: #10b981;
    }

    .legend-color.unanswered {
      background-color: white;
      border-color: #d1d5db;
    }

    .question-content {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
    }

    .question-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      max-width: 800px;
      margin: 0 auto;
    }

    .question-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    .options-list {
      margin-bottom: 2rem;
    }

    .option-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      margin-bottom: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
    }

    .option-item:hover {
      border-color: #2563eb;
      background-color: #eff6ff;
    }

    .option-item.selected {
      border-color: #2563eb;
      background-color: #eff6ff;
    }

    .option-radio {
      margin-top: 0.125rem;
      flex-shrink: 0;
    }

    .option-content {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .option-letter {
      color: #2563eb;
      font-weight: 600;
      flex-shrink: 0;
    }

    .option-text {
      line-height: 1.5;
    }

    .navigation-buttons {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .nav-right {
      display: flex;
      gap: 0.75rem;
    }

    /* Mobile Styles */
    @media (max-width: 768px) {
      .quiz-header {
        padding: 0.75rem;
      }

      .quiz-title h1 {
        font-size: 1.25rem;
      }

      .quiz-controls {
        width: 100%;
        justify-content: space-between;
      }

      .progress-section {
        padding: 0.75rem;
      }

      .question-list-mobile {
        display: block;
      }

      .quiz-main {
        flex-direction: column;
        min-height: auto;
      }

      .question-sidebar {
        display: none;
      }

      .question-content {
        padding: 1rem;
      }

      .question-card {
        padding: 1.5rem;
      }

      .question-title {
        font-size: 1.125rem;
        margin-bottom: 1.5rem;
      }

      .option-item {
        padding: 0.75rem;
        gap: 0.75rem;
      }

      .navigation-buttons {
        flex-direction: column;
        gap: 0.75rem;
      }

      .nav-right {
        width: 100%;
        justify-content: center;
      }

      .navigation-buttons .btn {
        width: 100%;
      }

      .question-legend {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 1rem;
      }
    }

    /* Timer specific positioning for practice mode */
    @media (min-width: 769px) {
      .quiz-main .question-sidebar .timer-sidebar {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .quiz-controls .timer {
        order: -1;
        width: 100%;
        justify-content: center;
        margin-bottom: 0.5rem;
      }
    }
  `]
})
export class QuizComponent implements OnInit, OnDestroy {
  questions: Question[] = [];
  currentQuestionIndex = 0;
  userAnswers: (number | null)[] = [];
  
  mode: 'study' | 'practice' = 'study';
  setId?: string;
  timeLimit = 0; // in seconds, 0 means no limit
  remainingTime = 0;
  timeSpent = 0;
  
  showResults = false;
  score = 0;
  correctAnswers = 0;
  unansweredCount = 0;
  
  // Mobile timer positioning
  isMobile = false;
  isTimerFixed = false;
  
  private timer?: any;
  private autoSaveTimer?: any;
  private startTime = Date.now();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private questionService: QuestionService
  ) {
    this.checkMobile();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkMobile();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: any) {
    if (this.isMobile && this.mode === 'practice' && this.timeLimit > 0) {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      this.isTimerFixed = scrollTop > 100; // Show fixed timer when scrolled down 100px
    }
  }

  private checkMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.mode = params['mode'] || 'study';
      this.setId = params['setId'];
      this.timeLimit = params['timeLimit'] ? parseInt(params['timeLimit']) * 60 : 0;
      
      const questionIds = JSON.parse(params['questions'] || '[]');
      
      this.questionService.getQuestions().subscribe(allQuestions => {
        this.questions = allQuestions.filter(q => questionIds.includes(q._id));
        this.userAnswers = new Array(this.questions.length).fill(null);
        
        if (this.timeLimit > 0) {
          this.remainingTime = this.timeLimit;
          this.startTimer();
        }
        
        this.loadSavedProgress();
      });
    });
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
  }

  get completionPercentage(): number {
    if (this.questions.length === 0) return 0;
    const answeredCount = this.userAnswers.filter(answer => answer !== null).length;
    return (answeredCount / this.questions.length) * 100;
  }

  getChar(code: number): string {
    return String.fromCharCode(code);
  }

  private startTimer() {
    this.timer = setInterval(() => {
      this.remainingTime--;
      this.timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
      
      if (this.remainingTime <= 0) {
        this.finishQuiz();
      }
    }, 1000);
  }

  private loadSavedProgress() {
    const saved = localStorage.getItem(`quiz-progress-${this.mode}-${this.setId || 'practice'}`);
    if (saved) {
      const progress = JSON.parse(saved);
      this.userAnswers = progress.answers || this.userAnswers;
      this.currentQuestionIndex = progress.currentIndex || 0;
    }
  }

  autoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setTimeout(() => {
      const progress = {
        answers: this.userAnswers,
        currentIndex: this.currentQuestionIndex,
        timestamp: Date.now()
      };
      
      localStorage.setItem(`quiz-progress-${this.mode}-${this.setId || 'practice'}`, JSON.stringify(progress));
    }, 1000);
  }

  get currentQuestion(): Question | null {
    return this.questions[this.currentQuestionIndex] || null;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.autoSave();
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.autoSave();
    }
  }

  goToQuestion(index: number) {
    this.currentQuestionIndex = index;
    this.autoSave();
  }

  saveAndExit() {
    this.autoSave();
    this.router.navigate([this.mode === 'study' ? '/study' : '/practice']);
  }

  finishQuiz() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    this.calculateResults();
    this.saveResults();
    this.clearProgress();
    this.showResults = true;
  }

  private calculateResults() {
    this.correctAnswers = 0;
    this.unansweredCount = 0;
    
    for (let i = 0; i < this.questions.length; i++) {
      if (this.userAnswers[i] === null) {
        this.unansweredCount++;
      } else if (this.userAnswers[i] === this.questions[i].correctAnswer) {
        this.correctAnswers++;
      }
    }
    
    this.score = this.questions.length > 0 ? this.correctAnswers / this.questions.length : 0;
    this.timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
  }

  private saveResults() {
    const result = {
      quizSetId: this.setId || 'practice',
      questions: this.questions,
      userAnswers: this.userAnswers,
      score: this.score,
      totalQuestions: this.questions.length,
      timeSpent: this.timeSpent,
      completedAt: new Date(),
      mode: this.mode
    };
    
    this.questionService.saveQuizResult(result);
  }

  private clearProgress() {
    localStorage.removeItem(`quiz-progress-${this.mode}-${this.setId || 'practice'}`);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  goHome() {
    this.router.navigate(['/']);
  }

  retakeQuiz() {
    // Clear previous results for study mode
    if (this.mode === 'study' && this.setId) {
      this.questionService.clearStudySetResult(this.setId);
    }
    
    // Reset quiz state
    this.userAnswers = new Array(this.questions.length).fill(null);
    this.currentQuestionIndex = 0;
    this.showResults = false;
    this.startTime = Date.now();
    
    // Clear any saved progress
    this.clearProgress();
    
    if (this.timeLimit > 0) {
      this.remainingTime = this.timeLimit;
      this.startTimer();
    }
  }
}