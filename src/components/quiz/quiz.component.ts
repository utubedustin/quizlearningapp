import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { Question, QuizResult } from '../../models/question.model';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css']
})
export class QuizComponent implements OnInit, OnDestroy {
  questions: Question[] = [];
  currentQuestionIndex = 0;
  userAnswers: (number | number[] | null)[] = [];
  
  mode: 'study' | 'practice' | 'review' = 'study';
  setId?: string;
  resultId?: string;
  timeLimit = 0; // in seconds, 0 means no limit
  remainingTime = 0;
  timeSpent = 0;
  
  showResults = false;
  score = 0;
  correctAnswers = 0;
  unansweredCount = 0;
  
  // Review mode data
  reviewResult?: QuizResult;
  
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
      this.resultId = params['resultId'];
      this.timeLimit = params['timeLimit'] ? parseInt(params['timeLimit']) * 60 : 0;
      
      const questionIds = JSON.parse(params['questions'] || '[]');
      
      this.questionService.getQuestions().subscribe(allQuestions => {
        this.questions = allQuestions.filter(q => questionIds.includes(q._id));
        
        if (this.mode === 'review') {
          this.loadReviewMode();
        } else {
          this.initializeQuiz();
        }
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

  private initializeQuiz() {
    // Always start with fresh answers
    this.userAnswers = new Array(this.questions.length).fill(null);
    this.currentQuestionIndex = 0;
    this.showResults = false;
    this.startTime = Date.now();
    
    // Clear any existing progress for this set
    this.clearProgress();
    
    if (this.timeLimit > 0) {
      this.remainingTime = this.timeLimit;
      this.startTimer();
    }
    
    // Only load saved progress if it's not a fresh retake
    const urlParams = new URLSearchParams(window.location.search);
    const isRetake = urlParams.get('retake') === 'true';
    
    if (!isRetake) {
      this.loadSavedProgress();
    }
  }

  private loadReviewMode() {
    if (!this.setId) return;
    
    // Load the most recent result for this set
    this.questionService.getQuizResults().subscribe(results => {
      const setResults = results.filter(r => r.mode === 'study' && r.quizSetId === this.setId);
      if (setResults.length > 0) {
        // Get the most recent result
        this.reviewResult = setResults.sort((a, b) => 
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        )[0];
        
        console.log('Review result loaded:', this.reviewResult);
      }
    });
  }

  get completionPercentage(): number {
    if (this.questions.length === 0) return 0;
    const answeredCount = this.userAnswers.filter(answer => answer !== null).length;
    return (answeredCount / this.questions.length) * 100;
  }

  getChar(code: number): string {
    return String.fromCharCode(code);
  }

  // Check if question is single choice (correctAnswer is number) or multiple choice (correctAnswer is array)
  isSingleChoice(question: Question): boolean {
    return typeof question.correctAnswer === 'number';
  }

  // Check if an option is selected by the user
  isOptionSelected(optionIndex: number): boolean {
    const currentAnswer = this.userAnswers[this.currentQuestionIndex];
    if (currentAnswer === null) return false;
    
    if (Array.isArray(currentAnswer)) {
      return currentAnswer.includes(optionIndex);
    } else {
      return currentAnswer === optionIndex;
    }
  }

  // Handle single choice selection (radio button)
  onSingleChoiceChange(optionIndex: number) {
    this.userAnswers[this.currentQuestionIndex] = optionIndex;
    this.autoSave();
  }

  // Handle multiple choice selection (checkbox)
  onMultipleChoiceChange(optionIndex: number, event: any) {
    let currentAnswer = this.userAnswers[this.currentQuestionIndex];
    
    if (!Array.isArray(currentAnswer)) {
      currentAnswer = [];
    }
    
    if (event.target.checked) {
      // Add option if not already selected
      if (!currentAnswer.includes(optionIndex)) {
        currentAnswer = [...currentAnswer, optionIndex];
      }
    } else {
      // Remove option if deselected
      currentAnswer = currentAnswer.filter(index => index !== optionIndex);
    }
    
    // Set to null if no options selected, otherwise set the array
    this.userAnswers[this.currentQuestionIndex] = currentAnswer.length > 0 ? currentAnswer : null;
    this.autoSave();
  }

  // Check if user's answer is correct
  isAnswerCorrect(userAnswer: number | number[] | null, correctAnswer: number | number[]): boolean {
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

  // Check if an option is correct
  isCorrectOption(optionIndex: number, correctAnswer: number | number[]): boolean {
    if (Array.isArray(correctAnswer)) {
      return correctAnswer.includes(optionIndex);
    } else {
      return correctAnswer === optionIndex;
    }
  }

  // Check if user selected this option
  isUserSelectedOption(optionIndex: number, userAnswer: number | number[] | null): boolean {
    if (userAnswer === null) return false;
    
    if (Array.isArray(userAnswer)) {
      return userAnswer.includes(optionIndex);
    } else {
      return userAnswer === optionIndex;
    }
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
    
    // Only save results for study and practice modes, not review mode
    if (this.mode === 'study' || this.mode === 'practice') {
      this.saveResults();
    }
    
    this.clearProgress();
    this.showResults = true;
  }

  private calculateResults() {
    this.correctAnswers = 0;
    this.unansweredCount = 0;
    
    for (let i = 0; i < this.questions.length; i++) {
      if (this.userAnswers[i] === null) {
        this.unansweredCount++;
      } else if (this.isAnswerCorrect(this.userAnswers[i], this.questions[i].correctAnswer)) {
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
      mode: this.mode as 'study' | 'practice' // Type assertion to ensure only valid modes are saved
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

  goBackToStudy() {
    this.router.navigate(['/study']);
  }

  retakeQuiz() {
    // Clear previous results for study mode
    if (this.mode === 'study' && this.setId) {
      this.questionService.clearStudySetResult(this.setId);
    }
    
    // Reset quiz state completely
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

  // Review mode helper methods
  getCorrectAnswersCount(): number {
    if (!this.reviewResult) return 0;
    let count = 0;
    for (let i = 0; i < this.questions.length; i++) {
      if (this.isAnswerCorrect(this.reviewResult.userAnswers[i], this.questions[i].correctAnswer)) {
        count++;
      }
    }
    return count;
  }

  getIncorrectAnswersCount(): number {
    if (!this.reviewResult) return 0;
    let count = 0;
    for (let i = 0; i < this.questions.length; i++) {
      if (this.reviewResult.userAnswers[i] !== null && 
          !this.isAnswerCorrect(this.reviewResult.userAnswers[i], this.questions[i].correctAnswer)) {
        count++;
      }
    }
    return count;
  }

  getUnansweredCount(): number {
    if (!this.reviewResult) return 0;
    return this.reviewResult.userAnswers.filter(answer => answer === null).length;
  }
}