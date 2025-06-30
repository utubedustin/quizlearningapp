import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuestionService } from '../services/question.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-4">Ứng dụng ôn luyện đề thi trắc nghiệm</h1>
        <p class="text-gray-600 text-lg">Hệ thống học tập và luyện thi hiệu quả với giao diện thân thiện</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="card text-center">
          <div class="text-3xl font-bold text-primary mb-2">{{ totalQuestions }}</div>
          <div class="text-gray-600">Tổng câu hỏi</div>
        </div>
        
        <div class="card text-center">
          <div class="text-3xl font-bold text-secondary mb-2">{{ studySets }}</div>
          <div class="text-gray-600">Đề học bài</div>
        </div>
        
        <div class="card text-center">
          <div class="text-3xl font-bold text-accent mb-2">{{ practiceTests }}</div>
          <div class="text-gray-600">Bài luyện thi</div>
        </div>
        
        <div class="card text-center">
          <div class="text-3xl font-bold text-success mb-2">{{ averageScore }}%</div>
          <div class="text-gray-600">Điểm trung bình</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="card hover:shadow-lg transition-shadow cursor-pointer" (click)="navigateTo('/questions')">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <span class="text-primary text-xl">📝</span>
            </div>
            <div>
              <h3 class="text-lg font-semibold">Quản lý câu hỏi</h3>
              <p class="text-gray-600 text-sm">Thêm, sửa, xóa câu hỏi</p>
            </div>
          </div>
          <button class="btn btn-primary w-full">Quản lý</button>
        </div>

        <div class="card hover:shadow-lg transition-shadow cursor-pointer" (click)="navigateTo('/study')">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
              <span class="text-secondary text-xl">📚</span>
            </div>
            <div>
              <h3 class="text-lg font-semibold">Học bài</h3>
              <p class="text-gray-600 text-sm">Ôn tập theo từng đề 10 câu</p>
            </div>
          </div>
          <button class="btn btn-secondary w-full">Bắt đầu học</button>
        </div>

        <div class="card hover:shadow-lg transition-shadow cursor-pointer" (click)="navigateTo('/practice')">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <span class="text-accent text-xl">🏆</span>
            </div>
            <div>
              <h3 class="text-lg font-semibold">Luyện thi</h3>
              <p class="text-gray-600 text-sm">Thi thử với thời gian và điểm số</p>
            </div>
          </div>
          <button class="btn btn-outline w-full">Luyện thi</button>
        </div>
      </div>

      <div class="mt-8">
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Tính năng nổi bật</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-start gap-3">
              <span class="text-success text-lg">✓</span>
              <div>
                <h4 class="font-medium">Import từ PDF</h4>
                <p class="text-gray-600 text-sm">Trích xuất câu hỏi tự động từ file PDF</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <span class="text-success text-lg">✓</span>
              <div>
                <h4 class="font-medium">Responsive Design</h4>
                <p class="text-gray-600 text-sm">Tối ưu cho mọi thiết bị</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <span class="text-success text-lg">✓</span>
              <div>
                <h4 class="font-medium">Auto Save</h4>
                <p class="text-gray-600 text-sm">Tự động lưu khi làm bài</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <span class="text-success text-lg">✓</span>
              <div>
                <h4 class="font-medium">Báo cáo chi tiết</h4>
                <p class="text-gray-600 text-sm">Thống kê kết quả học tập</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent {
  totalQuestions = 0;
  studySets = 0;
  practiceTests = 0;
  averageScore = 0;

  constructor(
    private questionService: QuestionService,
    private router: Router
  ) {
    this.loadStats();
  }

  private loadStats() {
    this.questionService.getQuestions().subscribe(questions => {
      this.totalQuestions = questions.length;
      this.studySets = Math.ceil(questions.length / 10);
    });

    this.questionService.getQuizResults().subscribe(results => {
      this.practiceTests = results.filter(r => r.mode === 'practice').length;
      
      if (results.length > 0) {
        const totalScore = results.reduce((sum, r) => sum + r.score, 0);
        this.averageScore = Math.round((totalScore / results.length) * 100);
      }
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}