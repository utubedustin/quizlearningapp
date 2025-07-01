import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuestionService } from '../../services/question.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
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