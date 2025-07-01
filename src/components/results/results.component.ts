import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionService } from '../../services/question.service';
import { QuizResult } from '../../models/question.model';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
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
  showDebugInfo = false;
  lastRefresh = new Date();

  constructor(private questionService: QuestionService) {}

  ngOnInit() {
    console.log('ResultsComponent ngOnInit');
    this.loadResults();
  }

  loadResults() {
    this.questionService.getQuizResults().subscribe(results => {
      console.log('Results loaded in ResultsComponent:', results.length);
      this.allResults = results;
      this.studyResults = results.filter(r => r.mode === 'study');
      this.practiceResults = results.filter(r => r.mode === 'practice')
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      
      console.log('Study results:', this.studyResults.length);
      console.log('Practice results:', this.practiceResults.length);
      
      this.calculateStats();
      this.generateChartData();
      this.lastRefresh = new Date();
    });
  }

  refreshData() {
    console.log('Refreshing data...');
    this.questionService.refreshData();
    this.loadResults();
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