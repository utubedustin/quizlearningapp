import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Question, QuizSet, QuizResult, ExamConfig } from '../models/question.model';
import { MongoDBService } from './mongodb.service';
import { PDFParserService, PDFParseResult } from './pdf-parser.service';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private questionsSubject = new BehaviorSubject<Question[]>([]);
  private quizResultsSubject = new BehaviorSubject<QuizResult[]>([]);
  private studyResultsSubject = new BehaviorSubject<QuizResult[]>([]);
  
  questions$ = this.questionsSubject.asObservable();
  quizResults$ = this.quizResultsSubject.asObservable();
  studyResults$ = this.studyResultsSubject.asObservable();

  constructor(
    private mongoService: MongoDBService,
    private pdfParser: PDFParserService
  ) {
    this.loadData();
  }

  private loadData() {
    // Load questions from MongoDB
    this.mongoService.getQuestions().pipe(
      catchError(error => {
        console.error('Failed to load questions from MongoDB, using localStorage:', error);
        return this.loadQuestionsFromLocalStorage();
      })
    ).subscribe(questions => {
      this.questionsSubject.next(questions);
    });

    // Load practice results from MongoDB
    this.mongoService.getPracticeResults().pipe(
      catchError(error => {
        console.error('Failed to load practice results from MongoDB, using localStorage:', error);
        return this.loadPracticeResultsFromLocalStorage();
      })
    ).subscribe(results => {
      this.quizResultsSubject.next(results);
    });

    // Load study results from localStorage (as requested)
    this.loadStudyResultsFromLocalStorage();
  }

  private loadQuestionsFromLocalStorage(): Observable<Question[]> {
    const saved = localStorage.getItem('questions');
    if (saved) {
      return of(JSON.parse(saved));
    }
    return of(this.getMockQuestions());
  }

  private loadPracticeResultsFromLocalStorage(): Observable<QuizResult[]> {
    const saved = localStorage.getItem('practice-results');
    return of(saved ? JSON.parse(saved) : []);
  }

  private loadStudyResultsFromLocalStorage() {
    const saved = localStorage.getItem('study-results');
    const studyResults = saved ? JSON.parse(saved) : [];
    this.studyResultsSubject.next(studyResults);
  }

  private getMockQuestions(): Question[] {
    return [
      {
        id: '1',
        content: 'Thủ đô của Việt Nam là gì?',
        options: ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Huế'],
        correctAnswer: 1,
        category: 'Địa lý',
        difficulty: 'easy',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2', 
        content: 'Ai là tác giả của tác phẩm "Truyện Kiều"?',
        options: ['Nguyễn Bỉnh Khiêm', 'Nguyễn Du', 'Hồ Xuân Hương', 'Nguyễn Đình Chiểu'],
        correctAnswer: 1,
        category: 'Văn học',
        difficulty: 'medium',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      // Add more mock questions as needed
    ];
  }

  getQuestions(): Observable<Question[]> {
    return this.questions$;
  }

  getQuestionById(id: string): Observable<Question | undefined> {
    return this.questions$.pipe(
      map(questions => questions.find(q => q.id === id))
    );
  }

  addQuestion(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): void {
    this.mongoService.addQuestion(question).pipe(
      catchError(error => {
        console.error('Failed to add question to MongoDB, saving to localStorage:', error);
        return this.addQuestionToLocalStorage(question);
      })
    ).subscribe(newQuestion => {
      const currentQuestions = this.questionsSubject.value;
      this.questionsSubject.next([...currentQuestions, newQuestion]);
    });
  }

  private addQuestionToLocalStorage(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Observable<Question> {
    const newQuestion: Question = {
      ...question,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const currentQuestions = this.questionsSubject.value;
    const updatedQuestions = [...currentQuestions, newQuestion];
    localStorage.setItem('questions', JSON.stringify(updatedQuestions));
    
    return of(newQuestion);
  }

  updateQuestion(id: string, updates: Partial<Question>): void {
    this.mongoService.updateQuestion(id, updates).pipe(
      catchError(error => {
        console.error('Failed to update question in MongoDB, updating localStorage:', error);
        return this.updateQuestionInLocalStorage(id, updates);
      })
    ).subscribe(updatedQuestion => {
      const currentQuestions = this.questionsSubject.value;
      const updatedQuestions = currentQuestions.map(q => 
        q.id === id ? updatedQuestion : q
      );
      this.questionsSubject.next(updatedQuestions);
    });
  }

  private updateQuestionInLocalStorage(id: string, updates: Partial<Question>): Observable<Question> {
    const currentQuestions = this.questionsSubject.value;
    const updatedQuestions = currentQuestions.map(q => 
      q.id === id ? { ...q, ...updates, updatedAt: new Date() } : q
    );
    localStorage.setItem('questions', JSON.stringify(updatedQuestions));
    
    const updatedQuestion = updatedQuestions.find(q => q.id === id)!;
    return of(updatedQuestion);
  }

  deleteQuestion(id: string): void {
    this.mongoService.deleteQuestion(id).pipe(
      catchError(error => {
        console.error('Failed to delete question from MongoDB, deleting from localStorage:', error);
        return this.deleteQuestionFromLocalStorage(id);
      })
    ).subscribe(() => {
      const currentQuestions = this.questionsSubject.value;
      const updatedQuestions = currentQuestions.filter(q => q.id !== id);
      this.questionsSubject.next(updatedQuestions);
    });
  }

  private deleteQuestionFromLocalStorage(id: string): Observable<{success: boolean}> {
    const currentQuestions = this.questionsSubject.value;
    const updatedQuestions = currentQuestions.filter(q => q.id !== id);
    localStorage.setItem('questions', JSON.stringify(updatedQuestions));
    return of({success: true});
  }

  // Enhanced PDF processing with duplicate detection
  async processPDFFile(file: File): Promise<PDFParseResult> {
    try {
      // Parse PDF
      const parseResult = await this.pdfParser.parsePDFFile(file);
      
      if (parseResult.questions.length === 0) {
        return parseResult;
      }

      // Validate questions
      const validation = this.pdfParser.validateQuestions(parseResult.questions);
      
      if (validation.invalid.length > 0) {
        console.warn('Invalid questions found:', validation.invalid);
      }

      // Check for duplicates against existing questions
      const duplicateCheck = await this.mongoService.checkDuplicateQuestions(validation.valid).toPromise();
      
      if (duplicateCheck && duplicateCheck.unique.length > 0) {
        // Add unique questions to MongoDB
        const bulkResult = await this.mongoService.addMultipleQuestions(duplicateCheck.unique).toPromise();
        
        if (bulkResult) {
          // Update local state
          const currentQuestions = this.questionsSubject.value;
          this.questionsSubject.next([...currentQuestions, ...bulkResult.inserted]);
          
          return {
            questions: bulkResult.inserted,
            errors: [...parseResult.errors, ...bulkResult.errors],
            totalExtracted: parseResult.totalExtracted,
            duplicatesFound: bulkResult.duplicates + (duplicateCheck.duplicates?.length || 0)
          };
        }
      }

      return {
        ...parseResult,
        questions: validation.valid,
        duplicatesFound: duplicateCheck?.duplicates?.length || 0
      };

    } catch (error) {
      console.error('PDF processing error:', error);
      return {
        questions: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        totalExtracted: 0,
        duplicatesFound: 0
      };
    }
  }

  createStudySets(): QuizSet[] {
    const questions = this.questionsSubject.value;
    const sets: QuizSet[] = [];
    
    for (let i = 0; i < questions.length; i += 10) {
      const setQuestions = questions.slice(i, i + 10);
      sets.push({
        id: `set-${Math.floor(i / 10) + 1}`,
        name: `Đề ${Math.floor(i / 10) + 1}`,
        questions: setQuestions,
        createdAt: new Date()
      });
    }
    
    return sets;
  }

  createRandomQuiz(config: ExamConfig): Question[] {
    const allQuestions = [...this.questionsSubject.value];
    
    if (config.randomize) {
      for (let i = allQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
      }
    }
    
    return allQuestions.slice(0, Math.min(config.numberOfQuestions, allQuestions.length));
  }

  saveQuizResult(result: Omit<QuizResult, 'id'>): void {
    if (result.mode === 'practice') {
      // Save practice results to MongoDB
      this.mongoService.savePracticeResult(result).pipe(
        catchError(error => {
          console.error('Failed to save practice result to MongoDB, saving to localStorage:', error);
          return this.savePracticeResultToLocalStorage(result);
        })
      ).subscribe(savedResult => {
        const currentResults = this.quizResultsSubject.value;
        this.quizResultsSubject.next([...currentResults, savedResult]);
      });
    } else {
      // Save study results to localStorage only
      this.saveStudyResultToLocalStorage(result);
    }
  }

  private savePracticeResultToLocalStorage(result: Omit<QuizResult, 'id'>): Observable<QuizResult> {
    const newResult: QuizResult = {
      ...result,
      id: Date.now().toString()
    };

    const currentResults = this.quizResultsSubject.value;
    const updatedResults = [...currentResults, newResult];
    localStorage.setItem('practice-results', JSON.stringify(updatedResults));
    
    return of(newResult);
  }

  private saveStudyResultToLocalStorage(result: Omit<QuizResult, 'id'>): void {
    const newResult: QuizResult = {
      ...result,
      id: Date.now().toString()
    };

    const currentResults = this.studyResultsSubject.value;
    const filteredResults = currentResults.filter(r => 
      !(r.mode === 'study' && r.quizSetId === result.quizSetId)
    );
    const updatedResults = [...filteredResults, newResult];
    
    localStorage.setItem('study-results', JSON.stringify(updatedResults));
    this.studyResultsSubject.next(updatedResults);
  }

  clearStudySetResult(setId: string): void {
    const currentResults = this.studyResultsSubject.value;
    const filteredResults = currentResults.filter(r => 
      !(r.mode === 'study' && r.quizSetId === setId)
    );
    
    localStorage.setItem('study-results', JSON.stringify(filteredResults));
    this.studyResultsSubject.next(filteredResults);
  }

  getQuizResults(): Observable<QuizResult[]> {
    // Combine practice results (from MongoDB) and study results (from localStorage)
    return forkJoin([
      this.quizResults$,
      this.studyResults$
    ]).pipe(
      map(([practiceResults, studyResults]) => [...practiceResults, ...studyResults])
    );
  }

  // Get statistics
  getStatistics(): Observable<{
    totalQuestions: number;
    totalPracticeResults: number;
    averageScore: number;
    categoriesCount: { [key: string]: number };
    difficultyCount: { [key: string]: number };
  }> {
    return this.mongoService.getStatistics().pipe(
      catchError(error => {
        console.error('Failed to get statistics from MongoDB, calculating locally:', error);
        return this.calculateLocalStatistics();
      })
    );
  }

  private calculateLocalStatistics(): Observable<{
    totalQuestions: number;
    totalPracticeResults: number;
    averageScore: number;
    categoriesCount: { [key: string]: number };
    difficultyCount: { [key: string]: number };
  }> {
    const questions = this.questionsSubject.value;
    const practiceResults = this.quizResultsSubject.value.filter(r => r.mode === 'practice');
    
    const categoriesCount: { [key: string]: number } = {};
    const difficultyCount: { [key: string]: number } = {};
    
    questions.forEach(q => {
      const category = q.category || 'Chưa phân loại';
      const difficulty = q.difficulty || 'medium';
      
      categoriesCount[category] = (categoriesCount[category] || 0) + 1;
      difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
    });
    
    const averageScore = practiceResults.length > 0 
      ? practiceResults.reduce((sum, r) => sum + r.score, 0) / practiceResults.length
      : 0;
    
    return of({
      totalQuestions: questions.length,
      totalPracticeResults: practiceResults.length,
      averageScore: Math.round(averageScore * 100),
      categoriesCount,
      difficultyCount
    });
  }
}