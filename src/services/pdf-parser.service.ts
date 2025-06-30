import { Injectable } from '@angular/core';
import { Question } from '../models/question.model';

export interface PDFParseResult {
  questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: string[];
  totalExtracted: number;
  duplicatesFound: number;
}

@Injectable({
  providedIn: 'root'
})
export class PDFParserService {

  async parsePDFFile(file: File): Promise<PDFParseResult> {
    try {
      const text = await this.extractTextFromPDF(file);
      const questions = this.parseQuestionsFromText(text);
      
      return {
        questions,
        errors: [],
        totalExtracted: questions.length,
        duplicatesFound: 0
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      return {
        questions: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        totalExtracted: 0,
        duplicatesFound: 0
      };
    }
  }

  private async extractTextFromPDF(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Import pdfjs-dist dynamically
          const pdfjsLib = await import('pdfjs-dist');
          
          // Set worker source
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;
          
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          
          // Extract text from all pages
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n';
          }
          
          resolve(fullText);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private parseQuestionsFromText(text: string): Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] {
    const questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Multiple parsing patterns for different PDF formats
    const patterns = [
      this.parsePattern1(text), // Standard numbered format
      this.parsePattern2(text), // Question: format
      this.parsePattern3(text), // Câu hỏi format
    ];
    
    // Use the pattern that found the most questions
    const bestResult = patterns.reduce((best, current) => 
      current.length > best.length ? current : best, []);
    
    return bestResult;
  }

  // Pattern 1: Standard numbered format (1., 2., 3., etc.)
  private parsePattern1(text: string): Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] {
    const questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Split by question numbers
    const questionBlocks = text.split(/(?=\d+\.\s+)/);
    
    for (const block of questionBlocks) {
      if (block.trim().length < 10) continue; // Skip short blocks
      
      const question = this.parseQuestionBlock(block);
      if (question) {
        questions.push(question);
      }
    }
    
    return questions;
  }

  // Pattern 2: Question: format
  private parsePattern2(text: string): Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] {
    const questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    const questionBlocks = text.split(/(?=Question\s*:)/i);
    
    for (const block of questionBlocks) {
      if (block.trim().length < 10) continue;
      
      const question = this.parseQuestionBlock(block);
      if (question) {
        questions.push(question);
      }
    }
    
    return questions;
  }

  // Pattern 3: Vietnamese "Câu" format
  private parsePattern3(text: string): Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] {
    const questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    const questionBlocks = text.split(/(?=Câu\s+\d+)/i);
    
    for (const block of questionBlocks) {
      if (block.trim().length < 10) continue;
      
      const question = this.parseQuestionBlock(block);
      if (question) {
        questions.push(question);
      }
    }
    
    return questions;
  }

  private parseQuestionBlock(block: string): Omit<Question, 'id' | 'createdAt' | 'updatedAt'> | null {
    try {
      // Clean the block
      const cleanBlock = block.trim().replace(/\s+/g, ' ');
      
      // Extract question content
      const questionMatch = cleanBlock.match(/(?:\d+\.|Question\s*:|Câu\s+\d+)[:\.]?\s*(.+?)(?=[A-D][\.\)])/i);
      if (!questionMatch) return null;
      
      const questionContent = questionMatch[1].trim();
      if (questionContent.length < 5) return null;
      
      // Extract options
      const optionPatterns = [
        /([A-D])[\.\)]\s*([^A-D]+?)(?=[A-D][\.\)]|$)/gi,
        /([A-D])\s*[\.\)]\s*([^A-D]+?)(?=[A-D]\s*[\.\)]|$)/gi,
      ];
      
      let options: string[] = [];
      let correctAnswer = -1;
      
      for (const pattern of optionPatterns) {
        const matches = [...cleanBlock.matchAll(pattern)];
        if (matches.length >= 4) {
          options = matches.slice(0, 4).map(match => match[2].trim());
          break;
        }
      }
      
      if (options.length < 4) {
        // Fallback: try to extract options without strict pattern
        const lines = cleanBlock.split(/\n|\r\n/).filter(line => line.trim());
        const optionLines = lines.filter(line => 
          /^[A-D][\.\)]/i.test(line.trim()) || 
          /[A-D]\s*[\.\)]/i.test(line.trim())
        );
        
        if (optionLines.length >= 4) {
          options = optionLines.slice(0, 4).map(line => 
            line.replace(/^[A-D][\.\)]\s*/i, '').trim()
          );
        }
      }
      
      if (options.length < 4) return null;
      
      // Try to detect correct answer
      correctAnswer = this.detectCorrectAnswer(cleanBlock, options);
      
      // Determine category and difficulty
      const category = this.detectCategory(questionContent);
      const difficulty = this.detectDifficulty(questionContent, options);
      
      return {
        content: questionContent,
        options,
        correctAnswer: correctAnswer >= 0 ? correctAnswer : 0, // Default to first option if not detected
        category,
        difficulty
      };
    } catch (error) {
      console.error('Error parsing question block:', error);
      return null;
    }
  }

  private detectCorrectAnswer(block: string, options: string[]): number {
    // Look for answer indicators
    const answerPatterns = [
      /(?:Đáp án|Answer|Correct)[\s:]*([A-D])/i,
      /(?:Chọn|Select)[\s:]*([A-D])/i,
      /\*([A-D])\*/g, // Asterisk marked answers
      /\b([A-D])\s*\(correct\)/i,
    ];
    
    for (const pattern of answerPatterns) {
      const match = block.match(pattern);
      if (match) {
        const letter = match[1].toUpperCase();
        return letter.charCodeAt(0) - 65; // Convert A,B,C,D to 0,1,2,3
      }
    }
    
    // Look for bold or emphasized text in options
    for (let i = 0; i < options.length; i++) {
      if (options[i].includes('**') || options[i].includes('*')) {
        return i;
      }
    }
    
    return -1; // Not detected
  }

  private detectCategory(questionContent: string): string {
    const categoryKeywords = {
      'Địa lý': ['địa lý', 'thủ đô', 'tỉnh', 'sông', 'núi', 'biển', 'geography'],
      'Lịch sử': ['lịch sử', 'năm', 'thế kỷ', 'chiến tranh', 'cách mạng', 'history'],
      'Văn học': ['văn học', 'tác giả', 'tác phẩm', 'thơ', 'truyện', 'literature'],
      'Khoa học': ['khoa học', 'vật lý', 'hóa học', 'sinh học', 'toán học', 'science'],
      'Kinh tế': ['kinh tế', 'tiền tệ', 'thương mại', 'economics'],
      'Văn hóa': ['văn hóa', 'lễ hội', 'truyền thống', 'culture'],
      'Công nghệ': ['công nghệ', 'máy tính', 'internet', 'technology'],
    };
    
    const lowerContent = questionContent.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return category;
      }
    }
    
    return 'Tổng hợp';
  }

  private detectDifficulty(questionContent: string, options: string[]): 'easy' | 'medium' | 'hard' {
    const contentLength = questionContent.length;
    const avgOptionLength = options.reduce((sum, opt) => sum + opt.length, 0) / options.length;
    
    // Simple heuristic based on content complexity
    if (contentLength < 50 && avgOptionLength < 20) {
      return 'easy';
    } else if (contentLength > 150 || avgOptionLength > 50) {
      return 'hard';
    } else {
      return 'medium';
    }
  }

  // Utility method to validate extracted questions
  validateQuestions(questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]): {
    valid: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
    invalid: { question: any; errors: string[] }[];
  } {
    const valid: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const invalid: { question: any; errors: string[] }[] = [];
    
    for (const question of questions) {
      const errors: string[] = [];
      
      if (!question.content || question.content.trim().length < 5) {
        errors.push('Nội dung câu hỏi quá ngắn');
      }
      
      if (!question.options || question.options.length !== 4) {
        errors.push('Phải có đúng 4 phương án trả lời');
      }
      
      if (question.options && question.options.some(opt => !opt || opt.trim().length < 1)) {
        errors.push('Các phương án trả lời không được để trống');
      }
      
      if (question.correctAnswer < 0 || question.correctAnswer > 3) {
        errors.push('Đáp án đúng phải từ 0-3');
      }
      
      if (errors.length === 0) {
        valid.push(question);
      } else {
        invalid.push({ question, errors });
      }
    }
    
    return { valid, invalid };
  }
}