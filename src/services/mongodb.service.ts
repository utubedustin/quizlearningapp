import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Question, QuizResult } from '../models/question.model';

export interface MongoDBConfig {
  connectionString: string;
  databaseName: string;
  isConnected: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MongoDBService {
  private configSubject = new BehaviorSubject<MongoDBConfig>({
    connectionString: environment.mongodb.connectionString,
    databaseName: environment.mongodb.databaseName,
    isConnected: false
  });

  config$ = this.configSubject.asObservable();

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {
    this.testConnection();
  }

  // Test MongoDB connection
  testConnection(): Observable<boolean> {
    return this.http.get<{success: boolean}>(`${environment.api.baseUrl}/test-connection`)
      .pipe(
        map(response => { 
          const currentConfig = this.configSubject.value;
          this.configSubject.next({
            ...currentConfig,
            isConnected: response.success
          });
          return response.success;
        }),
        catchError(error => {
          console.error('MongoDB connection failed:', error);
          const currentConfig = this.configSubject.value;
          this.configSubject.next({
            ...currentConfig,
            isConnected: false
          });
          return throwError(() => error);
        })
      );
  }

  // Update MongoDB configuration
  updateConfig(config: Partial<MongoDBConfig>): void {
    const currentConfig = this.configSubject.value;
    this.configSubject.next({
      ...currentConfig,
      ...config
    });
  }

  // Questions CRUD operations
  getQuestions(): Observable<Question[]> {
    return this.http.get<Question[]>(`${environment.api.baseUrl}/questions`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getQuestionById(id: string): Observable<Question> {
    return this.http.get<Question>(`${environment.api.baseUrl}/questions/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  addQuestion(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Observable<Question> {
    return this.http.post<Question>(`${environment.api.baseUrl}/questions`, question, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  addMultipleQuestions(questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]): Observable<{
    inserted: Question[];
    duplicates: number;
    errors: string[];
  }> {
    return this.http.post<{
      inserted: Question[];
      duplicates: number;
      errors: string[];
    }>(`${environment.api.baseUrl}/questions/bulk`, { questions }, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateQuestion(id: string, updates: Partial<Question>): Observable<Question> {
    return this.http.put<Question>(`${environment.api.baseUrl}/questions/${id}`, updates, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteQuestion(id: string): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(`${environment.api.baseUrl}/questions/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Check for duplicate questions
  checkDuplicateQuestions(questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]): Observable<{
    duplicates: string[];
    unique: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
  }> {
    return this.http.post<{
      duplicates: string[];
      unique: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
    }>(`${environment.api.baseUrl}/questions/check-duplicates`, { questions }, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Practice Results operations
  getPracticeResults(): Observable<QuizResult[]> {
    return this.http.get<QuizResult[]>(`${environment.api.baseUrl}/practice-results`)
      .pipe(
        catchError(this.handleError)
      );
  }

  savePracticeResult(result: Omit<QuizResult, 'id'>): Observable<QuizResult> {
    return this.http.post<QuizResult>(`${environment.api.baseUrl}/practice-results`, result, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  deletePracticeResult(id: string): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(`${environment.api.baseUrl}/practice-results/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Statistics
  getStatistics(): Observable<{
    totalQuestions: number;
    totalPracticeResults: number;
    averageScore: number;
    categoriesCount: { [key: string]: number };
    difficultyCount: { [key: string]: number };
  }> {
    return this.http.get<{
      totalQuestions: number;
      totalPracticeResults: number;
      averageScore: number;
      categoriesCount: { [key: string]: number };
      difficultyCount: { [key: string]: number };
    }>(`${environment.api.baseUrl}/statistics`)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any) {
    console.error('MongoDB Service Error:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }
}