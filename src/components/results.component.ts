import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionService } from '../services/question.service';
import { QuizResult } from '../models/question.model';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-8">
      <h1 class="text-2xl font-bold mb-6">Kết quả học tập</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="card text-center">
          <div class="text-3xl font-bold text-primary mb-2">{{ totalAttempts }}</div>
          <div class="text-gray-600">Tổng lần làm bài</div>
        </div>
        
        <div class="card text-center">
          <div class="text-3xl font-bold text-secondary mb-2">{{ averageScore }}%</div>
          <div class="text-gray-600">Điểm trung bình</div>
        </div>
        
        <div class="card text-center">
          <div class="text-3xl font-bold text-success mb-2">{{ bestScore }}%</div>
          <div class="text-gray-600">Điểm cao nhất</div>
        </div>
        
        <div class="card text-center">
          <div class="text-3xl font-bold text-accent mb-2">{{ studyHours }}</div>
          <div class="text-gray-600">Giờ học</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="card">
          <h2 class="text-lg font-semibold mb-4">Kết quả học bài</h2>
          
          <div *ngIf="studyResults.length === 0" class="text-center py-8 text-gray-500">
            Chưa có kết quả học bài nào
          </div>
          
          <div *ngIf="studyResults.length > 0" class="space-y-3">
            <div *ngFor="let result of studyResults" 
                 class="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <h4 class="font-medium">{{ getSetName(result.quizSetId) }}</h4>
                <div class="text-sm text-gray-600">
                  {{ result.completedAt | date:'dd/MM/yyyy HH:mm' }}
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold"
                     [class.text-success]="result.score >= 0.8"
                     [class.text-warning]="result.score >= 0.5 && result.score < 0.8"
                     [class.text-error]="result.score < 0.5">
                  {{ (result.score * 100) | number:'1.0-0' }}%
                </div>
                <div class="text-sm text-gray-600">
                  {{ result.score * result.totalQuestions | number:'1.0-0' }}/{{ result.totalQuestions }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h2 class="text-lg font-semibold mb-4">Kết quả luyện thi</h2>
          
          <div *ngIf="practiceResults.length === 0" class="text-center py-8 text-gray-500">
            Chưa có kết quả luyện thi nào
          </div>
          
          <div *ngIf="practiceResults.length > 0" class="space-y-3 max-h-96 overflow-y-auto">
            <div *ngFor="let result of practiceResults.slice(0, 10); let i = index" 
                 class="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <h4 class="font-medium">Lần thi #{{ practiceResults.length - i }}</h4>
                <div class="text-sm text-gray-600">
                  {{ result.completedAt | date:'dd/MM/yyyy HH:mm' }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ result.totalQuestions }} câu • {{ formatTime(result.timeSpent) }}
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold"
                     [class.text-success]="result.score >= 0.8"
                     [class.text-warning]="result.score >= 0.5 && result.score < 0.8"
                     [class.text-error]="result.score < 0.5">
                  {{ (result.score * 100) | number:'1.0-0' }}%
                </div>
                <div class="text-sm text-gray-600">
                  {{ result.score * result.totalQuestions | number:'1.0-0' }}/{{ result.totalQuestions }}
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="practiceResults.length > 10" class="text-center mt-3">
            <button class="btn btn-outline btn-sm" (click)="showAllPractice = !showAllPractice">
              {{ showAllPractice ? 'Ẩn bớt' : 'Xem tất cả (' + practiceResults.length + ')' }}
            </button>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <div class="card">
          <h2 class="text-lg font-semibold mb-4">Biểu đồ tiến độ</h2>
          
          <div *ngIf="chartData.length === 0" class="text-center py-8 text-gray-500">
            Chưa có dữ liệu để hiển thị biểu đồ
          </div>
          
          <div *ngIf="chartData.length > 0">
            <div class="mb-4">
              <div class="flex gap-4 text-sm">
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 bg-primary rounded"></div>
                  <span>Học bài</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 bg-secondary rounded"></div>
                  <span>Luyện thi</span>
                </div>
              </div>
            </div>
            
            <div class="space-y-2">
              <div *ngFor="let item of chartData" class="flex items-center gap-3">
                <div class="w-20 text-sm text-gray-600">
                  {{ item.date | date:'dd/MM' }}
                </div>
                <div class="flex-1 flex gap-1">
                  <div *ngFor="let score of item.scores" 
                       class="h-6 min-w-8 rounded flex items-center justify-center text-xs text-white"
                       [class.bg-primary]="score.mode === 'study'"
                       [class.bg-secondary]="score.mode === 'practice'"
                       [style.opacity]="score.score">
                    {{ (score.score * 100) | number:'1.0-0' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <div class="card">
          <h2 class="text-lg font-semibold mb-4">Phân tích chi tiết</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 class="font-medium mb-3">Điểm số theo thời gian</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">7 ngày qua</span>
                  <span class="font-medium">{{ getScoreByPeriod(7) }}%</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">30 ngày qua</span>
                  <span class="font-medium">{{ getScoreByPeriod(30) }}%</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Tất cả</span>
                  <span class="font-medium">{{ averageScore }}%</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="font-medium mb-3">Thống kê theo độ khó</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Dễ</span>
                  <span class="font-medium text-success">{{ getScoreByDifficulty('easy') }}%</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Trung bình</span>
                  <span class="font-medium text-warning">{{ getScoreByDifficulty('medium') }}%</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Khó</span>
                  <span class="font-medium text-error">{{ getScoreByDifficulty('hard') }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResultsComponent implements OnInit {
  allResults: QuizResult[] = [];
  studyResults: QuizResult[] = [];
  practiceResults: QuizResult[] = [];
  
  totalAttempts = 0;
  averageScore = 0;
  bestScore = 0;
  studyHours = 0;
  
  chartData: any[] = [];
  showAllPractice = false;

  constructor(private questionService: QuestionService) {}

  ngOnInit() {
    this.questionService.getQuizResults().subscribe(results => {
      console.log('Quiz results:', results);
      this.allResults = results;
      this.studyResults = results.filter(r => r.mode === 'study');
      this.practiceResults = results.filter(r => r.mode === 'practice')
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      
      this.calculateStats();
      this.generateChartData();
    });
  }

  private calculateStats() {
    this.totalAttempts = this.allResults.length;
    
    if (this.allResults.length > 0) {
      const totalScore = this.allResults.reduce((sum, r) => sum + r.score, 0);
      this.averageScore = Math.round((totalScore / this.allResults.length) * 100);
      
      this.bestScore = Math.round(Math.max(...this.allResults.map(r => r.score)) * 100);
      
      const totalTime = this.allResults.reduce((sum, r) => sum + r.timeSpent, 0);
      this.studyHours = Math.round(totalTime / 3600 * 10) / 10;
    }
  }

  private generateChartData() {
    const last30Days = new Array(30).fill(0).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date;
    });

    this.chartData = last30Days.map(date => {
      const dayResults = this.allResults.filter(r => {
        const resultDate = new Date(r.completedAt);
        return resultDate.toDateString() === date.toDateString();
      });

      return {
        date,
        scores: dayResults.map(r => ({
          score: r.score,
          mode: r.mode
        }))
      };
    }).filter(item => item.scores.length > 0);
  }

  getSetName(setId: string): string {
    return setId.replace('set-', 'Đề ');
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getScoreByPeriod(days: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentResults = this.allResults.filter(r => 
      new Date(r.completedAt) >= cutoffDate
    );

    if (recentResults.length === 0) return 0;

    const total = recentResults.reduce((sum, r) => sum + r.score, 0);
    return Math.round((total / recentResults.length) * 100);
  }

  getScoreByDifficulty(difficulty: string): number {
    const difficultyResults: number[] = [];

    this.allResults.forEach(result => {
      result.questions.forEach((question, index) => {
        if (question.difficulty === difficulty) {
          const userAnswer = result.userAnswers[index];
          if (userAnswer === question.correctAnswer) {
            difficultyResults.push(1);
          } else {
            difficultyResults.push(0);
          }
        }
      });
    });

    if (difficultyResults.length === 0) return 0;

    const total = difficultyResults.reduce((sum, score) => sum + score, 0);
    return Math.round((total / difficultyResults.length) * 100);
  }
}