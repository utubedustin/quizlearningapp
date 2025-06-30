import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuestionService } from '../services/question.service';
import { QuizSet, QuizResult } from '../models/question.model';
import { DialogService } from '../services/dialog.service';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-8">
      <h1 class="text-2xl font-bold mb-6">Học bài theo đề</h1>
      
      <div class="mb-6">
        <div class="info-card">
          <h3 class="info-title">Hướng dẫn học bài</h3>
          <ul class="info-list">
            <li>• Mỗi đề có 10 câu hỏi (đề cuối có thể ít hơn)</li>
            <li>• Làm xong sẽ có báo cáo kết quả chi tiết</li>
            <li>• Kết quả mới sẽ ghi đè lên kết quả cũ</li>
            <li>• Có thể làm lại nhiều lần để cải thiện điểm số</li>
          </ul>
        </div>
      </div>

      <div class="study-grid">
        <div *ngFor="let set of studySets" class="study-card">
          <div class="card-header">
            <div class="card-title">
              <h3 class="set-name">{{ set.name }}</h3>
              <p class="set-info">{{ set.questions.length }} câu hỏi</p>
            </div>
            <div class="card-score">
              <div *ngIf="getSetResult(set.id) as result" class="score-display">
                <div class="score-percentage" 
                     [class.score-excellent]="result.score >= 0.8"
                     [class.score-good]="result.score >= 0.5 && result.score < 0.8"
                     [class.score-poor]="result.score < 0.5">
                  {{ (result.score * 100) | number:'1.0-0' }}%
                </div>
                <div class="score-details">
                  {{ result.score * result.totalQuestions | number:'1.0-0' }}/{{ result.totalQuestions }}
                </div>
                <div class="score-date">
                  {{ result.completedAt | date:'dd/MM HH:mm' }}
                </div>
              </div>
              <div *ngIf="!getSetResult(set.id)" class="no-score">
                <div class="no-score-icon">📝</div>
                <div class="no-score-text">Chưa làm</div>
              </div>
            </div>
          </div>
          
          <div class="card-content">
            <div class="categories-section">
              <div class="categories-label">Danh mục:</div>
              <div class="categories-list">
                <span *ngFor="let category of getCategories(set)" 
                      class="category-tag">
                  {{ category }}
                </span>
              </div>
            </div>
            
            <div class="progress-section" *ngIf="getSetResult(set.id) as result">
              <div class="progress-bar">
                <div class="progress-fill" 
                     [style.width.%]="result.score * 100"
                     [class.progress-excellent]="result.score >= 0.8"
                     [class.progress-good]="result.score >= 0.5 && result.score < 0.8"
                     [class.progress-poor]="result.score < 0.5">
                </div>
              </div>
            </div>
          </div>
          
          <div class="card-actions">
            <!-- Bắt đầu - when never attempted -->
            <button *ngIf="!getSetResult(set.id)" 
                    class="action-btn btn-start" 
                    (click)="startStudySet(set)">
              <span class="btn-icon">🚀</span>
              <span class="btn-text">Bắt đầu</span>
            </button>
            
            <!-- Xem lại và Làm lại - when already attempted -->
            <div *ngIf="getSetResult(set.id)" class="action-buttons-group">
              <button class="action-btn btn-review" 
                      (click)="reviewStudySet(set)">
                <span class="btn-icon">👁️</span>
                <span class="btn-text">Xem lại</span>
              </button>
              
              <button class="action-btn btn-retake" 
                      (click)="confirmRetakeStudySet(set)">
                <span class="btn-icon">🔄</span>
                <span class="btn-text">Làm lại</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="studySets.length === 0" class="empty-state">
        <div class="empty-icon">📚</div>
        <h3 class="empty-title">Chưa có câu hỏi nào</h3>
        <p class="empty-description">Thêm câu hỏi để bắt đầu học bài</p>
        <button class="btn btn-primary" (click)="router.navigate(['/questions'])">
          Thêm câu hỏi
        </button>
      </div>
    </div>
  `,
  styles: [`
    .info-card {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .info-title {
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 0.75rem;
      font-size: 1.125rem;
    }

    .info-list {
      color: #1e40af;
      font-size: 0.875rem;
      line-height: 1.6;
      margin: 0;
      padding-left: 0;
      list-style: none;
    }

    .info-list li {
      margin-bottom: 0.25rem;
    }

    .study-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .study-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      overflow: hidden;
      border: 1px solid #f3f4f6;
    }

    .study-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      padding: 1.5rem 1.5rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .card-title {
      flex: 1;
    }

    .set-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.25rem 0;
    }

    .set-info {
      color: #6b7280;
      font-size: 0.875rem;
      margin: 0;
    }

    .card-score {
      text-align: right;
      flex-shrink: 0;
    }

    .score-display {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
    }

    .score-percentage {
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1;
    }

    .score-excellent { color: #059669; }
    .score-good { color: #d97706; }
    .score-poor { color: #dc2626; }

    .score-details {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
    }

    .score-date {
      font-size: 0.625rem;
      color: #9ca3af;
    }

    .no-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .no-score-icon {
      font-size: 1.5rem;
      opacity: 0.5;
    }

    .no-score-text {
      font-size: 0.75rem;
      color: #9ca3af;
      font-weight: 500;
    }

    .card-content {
      padding: 0 1.5rem 1rem;
    }

    .categories-section {
      margin-bottom: 1rem;
    }

    .categories-label {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .categories-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .category-tag {
      background: #f3f4f6;
      color: #374151;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .progress-section {
      margin-top: 0.75rem;
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background-color: #f3f4f6;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
      border-radius: 3px;
    }

    .progress-excellent { background-color: #059669; }
    .progress-good { background-color: #d97706; }
    .progress-poor { background-color: #dc2626; }

    .card-actions {
      padding: 1rem 1.5rem 1.5rem;
      border-top: 1px solid #f3f4f6;
      background: #fafafa;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
    }

    .btn-start {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.3);
    }

    .btn-start:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.4);
    }

    .action-buttons-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .btn-review {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      box-shadow: 0 4px 14px 0 rgba(5, 150, 105, 0.3);
    }

    .btn-review:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px 0 rgba(5, 150, 105, 0.4);
    }

    .btn-retake {
      background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
      color: white;
      box-shadow: 0 4px 14px 0 rgba(234, 88, 12, 0.3);
    }

    .btn-retake:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px 0 rgba(234, 88, 12, 0.4);
    }

    .btn-icon {
      font-size: 1rem;
    }

    .btn-text {
      font-weight: 600;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .empty-description {
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }

    /* Responsive Design */
    @media (max-width: 640px) {
      .study-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .study-card {
        border-radius: 12px;
      }

      .card-header {
        padding: 1.25rem 1.25rem 0.75rem;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .card-score {
        align-self: flex-end;
      }

      .set-name {
        font-size: 1.125rem;
      }

      .score-percentage {
        font-size: 1.25rem;
      }

      .card-content {
        padding: 0 1.25rem 0.75rem;
      }

      .card-actions {
        padding: 0.75rem 1.25rem 1.25rem;
      }

      .action-buttons-group {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .action-btn {
        padding: 0.875rem 1rem;
        font-size: 0.875rem;
      }
    }

    @media (min-width: 641px) and (max-width: 768px) {
      .study-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 769px) and (max-width: 1024px) {
      .study-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.25rem;
      }
    }

    @media (min-width: 1025px) {
      .study-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (min-width: 1400px) {
      .study-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  `]
})
export class StudyComponent implements OnInit {
  studySets: QuizSet[] = [];
  studyResults: QuizResult[] = [];

  constructor(
    private questionService: QuestionService,
    public router: Router,
    private dialogService: DialogService
  ) {}

  ngOnInit() {
    this.studySets = this.questionService.createStudySets();
    
    this.questionService.getQuizResults().subscribe(results => {
      this.studyResults = results.filter(r => r.mode === 'study');
    });
  }

  getSetResult(setId: string): QuizResult | undefined {
    return this.studyResults.find(r => r.quizSetId === setId);
  }

  getCategories(set: QuizSet): string[] {
    const categories = set.questions
      .map(q => q.category)
      .filter(Boolean)
      .filter((cat, index, arr) => arr.indexOf(cat) === index);
    
    return categories.length > 0 ? categories as string[] : ['Chưa phân loại'];
  }

  startStudySet(set: QuizSet) {
    this.router.navigate(['/quiz'], {
      queryParams: {
        mode: 'study',
        setId: set.id,
        questions: JSON.stringify(set.questions.map(q => q.id))
      }
    });
  }

  reviewStudySet(set: QuizSet) {
    const result = this.getSetResult(set.id);
    if (!result) return;

    // Navigate to results view with the specific result data
    this.router.navigate(['/quiz'], {
      queryParams: {
        mode: 'review',
        setId: set.id,
        questions: JSON.stringify(set.questions.map(q => q.id)),
        resultId: result.id
      }
    });
  }

  async confirmRetakeStudySet(set: QuizSet) {
    const confirmed = await this.dialogService.confirm({
      title: 'Làm lại bài học',
      message: `Bạn có chắc chắn muốn làm lại "${set.name}"?\n\nKết quả hiện tại sẽ bị xóa và bạn sẽ bắt đầu làm bài từ đầu.`,
      confirmText: 'Làm lại',
      cancelText: 'Hủy'
    });
    
    if (confirmed) {
      // Clear the previous result
      this.questionService.clearStudySetResult(set.id);
      
      // Start the quiz fresh
      this.startStudySet(set);
    }
  }
}