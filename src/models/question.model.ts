export interface Question {
  id: string;
  content: string;
  options: string[];
  correctAnswer: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizSet {
  id: string;
  name: string;
  questions: Question[];
  createdAt: Date;
}

export interface QuizResult {
  id: string;
  quizSetId: string;
  questions: Question[];
  userAnswers: (number | null)[];
  score: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
  completedAt: Date;
  mode: 'study' | 'practice';
}

export interface ExamConfig {
  numberOfQuestions: number;
  timeLimit: number; // in minutes
  randomize: boolean;
}


export interface PDFParseResult {
  questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: string[];
  totalExtracted: number;
  duplicatesFound: number;
}
