import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { ExamConfig, Question } from '../../models/question.model';

@Component({
  selector: 'app-practice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './practice.component.html',
  styleUrls: ['./practice.component.css']
})
export class PracticeComponent implements OnInit {
  totalQuestions = 0;
  practiceResults: any[] = [];
  categories: string[] = [];
  allQuestions: Question[] = [];
  
  examConfig: ExamConfig = {
    numberOfQuestions: 30,
    timeLimit: 30,
    randomize: true,
    category: '' // Add category filter
  };

  constructor(
    private questionService: QuestionService,
    public router: Router
  ) {}

  ngOnInit() {
    this.loadQuestions();
    
    this.loadPracticeResults();
  }

  private loadQuestions() {
    this.questionService.getQuestions().subscribe(questions => {
      this.allQuestions = questions;
      this.totalQuestions = questions.length;
      this.updateCategories();
      this.updateQuestionCount();
    });
  }

  private updateCategories() {
    const categorySet = new Set(
      this.allQuestions.map(q => q.category).filter(Boolean)
    );
    this.categories = ['', ...Array.from(categorySet)] as string[];
  }

  onCategoryChange() {
    this.updateQuestionCount();
  }

  private updateQuestionCount() {
    const filteredQuestions = this.getFilteredQuestions();
    this.totalQuestions = filteredQuestions.length;
    
    // Adjust numberOfQuestions if it exceeds available questions
    if (this.examConfig.numberOfQuestions > this.totalQuestions) {
      this.examConfig.numberOfQuestions = this.totalQuestions;
    }
  }

  private getFilteredQuestions(): Question[] {
    if (!this.examConfig.category) {
      return this.allQuestions;
    }
    return this.allQuestions.filter(q => q.category === this.examConfig.category);
  }

  loadPracticeResults() {
    this.questionService.getQuizResults().subscribe(results => {
      console.log('Practice component - All results:', results.length);
      this.practiceResults = results.filter(r => r.mode === 'practice')
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      console.log('Practice component - Practice results:', this.practiceResults.length);
    });
  }

  startPracticeTest() {
    const filteredQuestions = this.getFilteredQuestions();
    
    if (filteredQuestions.length === 0) {
      alert('Không có câu hỏi nào trong danh mục đã chọn!');
      return;
    }
    
    // Create custom random quiz from filtered questions
    const questions = this.createFilteredRandomQuiz(filteredQuestions);
    
    this.router.navigate(['/quiz'], {
      queryParams: {
        mode: 'practice',
        questions: JSON.stringify(questions.map(q => q._id)),
        timeLimit: this.examConfig.timeLimit,
        category: this.examConfig.category || 'Tất cả'
      }
    });
  }

  private createFilteredRandomQuiz(questions: Question[]): Question[] {
    const availableQuestions = [...questions];

    if (this.examConfig.randomize) {
      for (let i = availableQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableQuestions[i], availableQuestions[j]] = [availableQuestions[j], availableQuestions[i]];
      }
    }

    return availableQuestions.slice(
      0,
      Math.min(this.examConfig.numberOfQuestions, availableQuestions.length)
    );
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getAverageScore(): number {
    if (this.practiceResults.length === 0) return 0;
    const total = this.practiceResults.reduce((sum, result) => sum + result.score, 0);
    return Math.round((total / this.practiceResults.length) * 100);
  }

  getBestScore(): number {
    if (this.practiceResults.length === 0) return 0;
    const best = Math.max(...this.practiceResults.map(r => r.score));
    return Math.round(best * 100);
  }
}