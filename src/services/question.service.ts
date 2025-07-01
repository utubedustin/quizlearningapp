import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, forkJoin, combineLatest } from "rxjs";
import { map, catchError, switchMap, tap } from "rxjs/operators";
import {
  Question,
  QuizSet,
  QuizResult,
  ExamConfig,
  PDFParseResult,
} from "../models/question.model";
import { MongoDBService } from "./mongodb.service";  

@Injectable({
  providedIn: "root",
})
export class QuestionService {
  private questionsSubject = new BehaviorSubject<Question[]>([]);
  private quizResultsSubject = new BehaviorSubject<QuizResult[]>([]);
  private studyResultsSubject = new BehaviorSubject<QuizResult[]>([]);
  private isDataLoaded = false;

  questions$ = this.questionsSubject.asObservable();
  quizResults$ = this.quizResultsSubject.asObservable();
  studyResults$ = this.studyResultsSubject.asObservable();

  constructor(
    private mongoService: MongoDBService, 
  ) {
    this.loadData();
  }

  private loadData() {
    if (this.isDataLoaded) return;
    
    console.log('Loading data from services...');
    
    // Load questions from MongoDB
    this.mongoService
      .getQuestions()
      .pipe(
        tap(questions => console.log('Questions loaded from MongoDB:', questions.length)),
        catchError((error) => {
          console.error(
            "Failed to load questions from MongoDB, using localStorage:",
            error
          );
          return this.loadQuestionsFromLocalStorage();
        })
      )
      .subscribe((questions) => {
        this.questionsSubject.next(questions);
      });

    // Load practice results from MongoDB
    this.mongoService
      .getPracticeResults()
      .pipe(
        tap(results => console.log('Practice results loaded from MongoDB:', results.length)),
        catchError((error) => {
          console.error(
            "Failed to load practice results from MongoDB, using localStorage:",
            error
          );
          return this.loadPracticeResultsFromLocalStorage();
        })
      )
      .subscribe((results) => {
        this.quizResultsSubject.next(results);
      });

    // Load study results from localStorage (as requested)
    this.loadStudyResultsFromLocalStorage();
    this.isDataLoaded = true;
  }

  private loadQuestionsFromLocalStorage(): Observable<Question[]> {
    const saved = localStorage.getItem("questions");
    if (saved) {
      return of(JSON.parse(saved));
    }
    return of(this.getMockQuestions());
  }

  private loadPracticeResultsFromLocalStorage(): Observable<QuizResult[]> {
    const saved = localStorage.getItem("practice-results");
    return of(saved ? JSON.parse(saved) : []);
  }

  private loadStudyResultsFromLocalStorage() {
    const saved = localStorage.getItem("study-results");
    const studyResults = saved ? JSON.parse(saved) : [];
    console.log('Study results loaded from localStorage:', studyResults.length);
    console.log('Study results data:', studyResults);
    this.studyResultsSubject.next(studyResults);
  }

  private getMockQuestions(): Question[] {
    return [
      {
        _id: "1",
        content: "Thủ đô của Việt Nam là gì?",
        options: ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Huế"],
        correctAnswer: 1,
        category: "Địa lý",
        difficulty: "easy",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: "2",
        content: 'Ai là tác giả của tác phẩm "Truyện Kiều"?',
        options: [
          "Nguyễn Bỉnh Khiêm",
          "Nguyễn Du",
          "Hồ Xuân Hương",
          "Nguyễn Đình Chiểu",
        ],
        correctAnswer: 1,
        category: "Văn học",
        difficulty: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  getQuestions(): Observable<Question[]> {
    return this.questions$;
  }

  getQuestionById(id: string): Observable<Question | undefined> {
    return this.questions$.pipe(
      map((questions) => questions.find((q) => q._id === id))
    );
  }

  addQuestion(
    question: Omit<Question, "_id" | "createdAt" | "updatedAt">
  ): void {
    this.mongoService
      .addQuestion(question)
      .pipe(
        catchError((error) => {
          console.error(
            "Failed to add question to MongoDB, saving to localStorage:",
            error
          );
          return this.addQuestionToLocalStorage(question);
        })
      )
      .subscribe((newQuestion) => {
        const currentQuestions = this.questionsSubject.value;
        this.questionsSubject.next([...currentQuestions, newQuestion]);
      });
  }

  private addQuestionToLocalStorage(
    question: Omit<Question, "_id" | "createdAt" | "updatedAt">
  ): Observable<Question> {
    const newQuestion: Question = {
      ...question,
      _id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const currentQuestions = this.questionsSubject.value;
    const updatedQuestions = [...currentQuestions, newQuestion];
    localStorage.setItem("questions", JSON.stringify(updatedQuestions));

    return of(newQuestion);
  }

  updateQuestion(id: string, updates: Partial<Question>): void {
    this.mongoService
      .updateQuestion(id, updates)
      .pipe(
        catchError((error) => {
          console.error(
            "Failed to update question in MongoDB, updating localStorage:",
            error
          );
          return this.updateQuestionInLocalStorage(id, updates);
        })
      )
      .subscribe((updatedQuestion) => {
        const currentQuestions = this.questionsSubject.value;
        const updatedQuestions = currentQuestions.map((q) =>
          q._id === id ? updatedQuestion : q
        );
        this.questionsSubject.next(updatedQuestions);
      });
  }

  private updateQuestionInLocalStorage(
    id: string,
    updates: Partial<Question>
  ): Observable<Question> {
    const currentQuestions = this.questionsSubject.value;
    const updatedQuestions = currentQuestions.map((q) =>
      q._id === id ? { ...q, ...updates, updatedAt: new Date() } : q
    );
    localStorage.setItem("questions", JSON.stringify(updatedQuestions));

    const updatedQuestion = updatedQuestions.find((q) => q._id === id)!;
    return of(updatedQuestion);
  }

  deleteQuestion(id: string): void {
    this.mongoService
      .deleteQuestion(id)
      .pipe(
        catchError((error) => {
          console.error(
            "Failed to delete question from MongoDB, deleting from localStorage:",
            error
          );
          return this.deleteQuestionFromLocalStorage(id);
        })
      )
      .subscribe(() => {
        const currentQuestions = this.questionsSubject.value;
        const updatedQuestions = currentQuestions.filter((q) => q._id !== id);
        this.questionsSubject.next(updatedQuestions);
      });
  }

  private deleteQuestionFromLocalStorage(
    id: string
  ): Observable<{ success: boolean }> {
    const currentQuestions = this.questionsSubject.value;
    const updatedQuestions = currentQuestions.filter((q) => q._id !== id);
    localStorage.setItem("questions", JSON.stringify(updatedQuestions));
    return of({ success: true });
  } 

  createStudySets(): QuizSet[] {
    const questions = this.questionsSubject.value;
    const sets: QuizSet[] = [];

    for (let i = 0; i < questions.length; i += 20) {
      const setQuestions = questions.slice(i, i + 20);
      sets.push({
        _id: `set-${Math.floor(i / 20) + 1}`,
        name: `Đề ${Math.floor(i / 20) + 1}`,
        questions: setQuestions,
        createdAt: new Date(),
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

    return allQuestions.slice(
      0,
      Math.min(config.numberOfQuestions, allQuestions.length)
    );
  }

  saveQuizResult(result: Omit<QuizResult, "id">): void {
    console.log('Saving quiz result:', result);
    
    if (result.mode === "practice") {
      // Save practice results to MongoDB
      this.mongoService
        .savePracticeResult(result)
        .pipe(
          tap(savedResult => console.log('Practice result saved to MongoDB:', savedResult)),
          catchError((error) => {
            console.error(
              "Failed to save practice result to MongoDB, saving to localStorage:",
              error
            );
            return this.savePracticeResultToLocalStorage(result);
          })
        )
        .subscribe((savedResult) => {
          const currentResults = this.quizResultsSubject.value;
          this.quizResultsSubject.next([...currentResults, savedResult]);
        });
    } else {
      // Save study results to localStorage only
      this.saveStudyResultToLocalStorage(result);
    }
  }

  private savePracticeResultToLocalStorage(
    result: Omit<QuizResult, "id">
  ): Observable<QuizResult> {
    const newResult: QuizResult = {
      ...result,
      id: Date.now().toString(),
    };

    const currentResults = this.quizResultsSubject.value;
    const updatedResults = [...currentResults, newResult];
    localStorage.setItem("practice-results", JSON.stringify(updatedResults));

    return of(newResult);
  }

  private saveStudyResultToLocalStorage(result: Omit<QuizResult, "id">): void {
    const newResult: QuizResult = {
      ...result,
      id: Date.now().toString(),
    };

    const currentResults = this.studyResultsSubject.value;
    const filteredResults = currentResults.filter(
      (r) => !(r.mode === "study" && r.quizSetId === result.quizSetId)
    );
    const updatedResults = [...filteredResults, newResult];

    console.log('Saving study result to localStorage:', newResult);
    localStorage.setItem("study-results", JSON.stringify(updatedResults));
    this.studyResultsSubject.next(updatedResults);
  }

  clearStudySetResult(setId: string): void {
    const currentResults = this.studyResultsSubject.value;
    const filteredResults = currentResults.filter(
      (r) => !(r.mode === "study" && r.quizSetId === setId)
    );

    localStorage.setItem("study-results", JSON.stringify(filteredResults));
    this.studyResultsSubject.next(filteredResults);
  }

  getQuizResults(): Observable<QuizResult[]> {
    // Use combineLatest instead of forkJoin to get real-time updates
    return combineLatest([this.quizResults$, this.studyResults$]).pipe(
      map(([practiceResults, studyResults]) => {
        console.log('Combined results - Practice:', practiceResults.length, 'Study:', studyResults.length);
        const combined = [...practiceResults, ...studyResults];
        console.log('Total combined results:', combined.length);
        return combined;
      })
    );
  }

  // Force refresh data
  refreshData(): void {
    console.log('Force refreshing data...');
    this.isDataLoaded = false;
    this.loadData();
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
      catchError((error) => {
        console.error(
          "Failed to get statistics from MongoDB, calculating locally:",
          error
        );
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
    const practiceResults = this.quizResultsSubject.value.filter(
      (r) => r.mode === "practice"
    );

    const categoriesCount: { [key: string]: number } = {};
    const difficultyCount: { [key: string]: number } = {};

    questions.forEach((q) => {
      const category = q.category || "Chưa phân loại";
      const difficulty = q.difficulty || "medium";

      categoriesCount[category] = (categoriesCount[category] || 0) + 1;
      difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
    });

    const averageScore =
      practiceResults.length > 0
        ? practiceResults.reduce((sum, r) => sum + r.score, 0) /
          practiceResults.length
        : 0;

    return of({
      totalQuestions: questions.length,
      totalPracticeResults: practiceResults.length,
      averageScore: Math.round(averageScore * 100),
      categoriesCount,
      difficultyCount,
    });
  }

  importQuestionsFromJson(data: any[]): Promise<any> {
    const added:any = [];
    const errors: string[] = [];

    data.forEach((q, index) => {
      if (q.question && Array.isArray(q.options) && q.correct_answers) {
        const correctIndex = q.options.findIndex((opt: any) =>
          q.correct_answers.includes(opt)
        );
        if (correctIndex !== -1) {
          added.push({
            content: q.question,
            options: q.options,
            correctAnswer: correctIndex,
            category: q.category || "",
            difficulty: q.difficulty || "medium",
            createdAt: new Date(),
          });
        } else {
          errors.push(`Câu ${index + 1} không có đáp án khớp.`);
        }
      } else {
        errors.push(`Câu ${index + 1} thiếu dữ liệu.`);
      }
    });

    return Promise.resolve({
      questions: added,
      duplicatesFound: 0,
      errors,
    });
  }
}