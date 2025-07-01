import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { ExamConfig } from '../../models/question.model';

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
  
  examConfig: ExamConfig = {
    numberOfQuestions: 30,
    timeLimit: 30,
    randomize: true
  };

  constructor(
    private questionService: QuestionService,
    public router: Router
  ) {}

  ngOnInit() {
    this.questionService.getQuestions().subscribe(questions => {
      this.totalQuestions = questions.length;
    });
    
    this.loadPracticeResults();
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
    const questions = this.questionService.createRandomQuiz(this.examConfig);
    
    this.router.navigate(['/quiz'], {
      queryParams: {
        mode: 'practice',
        questions: JSON.stringify(questions.map(q => q._id)),
        timeLimit: this.examConfig.timeLimit
      }
    });
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