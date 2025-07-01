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
            
            // Better text extraction with positioning
            const pageText = textContent.items
              .map((item: any) => {
                if ('str' in item) {
                  return item.str;
                }
                return '';
              })
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
    // Clean and normalize the text
    const cleanText = this.cleanText(text);
    
    // Try multiple parsing strategies
    const strategies = [
      () => this.parseNumberedQuestions(cleanText),
      () => this.parseQuestionKeywordFormat(cleanText),
      () => this.parseVietnameseFormat(cleanText),
      () => this.parseAlternativeFormat(cleanText)
    ];
    
    let bestResult: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result.length > bestResult.length) {
          bestResult = result;
        }
      } catch (error) {
        console.warn('Parsing strategy failed:', error);
      }
    }
    
    // Validate and clean the results
    return this.validateAndCleanQuestions(bestResult);
  }

  private cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove page numbers and headers/footers
      .replace(/Page \d+/gi, '')
      .replace(/Trang \d+/gi, '')
      // Clean up common PDF artifacts
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF.,;:!?()\[\]{}""''`~@#$%^&*+=<>\/\\|-]/g, ' ')
      // Normalize Vietnamese characters
      .replace(/\u00A0/g, ' ') // Non-breaking space
      .trim();
  }

  private parseNumberedQuestions(text: string): Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] {
    const questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Enhanced pattern for numbered questions
    const questionPattern = /(?:^|\n)\s*(\d+)[\.\)]\s*(.+?)(?=(?:\n\s*\d+[\.\)]|\n\s*[A-D][\.\)]\s*|$))/gis;
    const matches = text.matchAll(questionPattern);
    
    for (const match of matches) {
      const questionNumber = parseInt(match[1]);
      const questionBlock = match[2].trim();
      
      if (questionBlock.length < 10) continue;
      
      const question = this.parseQuestionBlock(questionBlock, questionNumber);
      if (question) {
        questions.push(question);
      }
    }
    
    return questions;
  }

  private parseQuestionKeywordFormat(text: string): Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] {
    const questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Pattern for "Question:" format
    const questionPattern = /(?:Question|Câu hỏi)\s*:?\s*(.+?)(?=(?:Question|Câu hỏi)\s*:?|$)/gis;
    const matches = text.matchAll(questionPattern);
    
    let questionNumber = 1;
    for (const match of matches) {
      const questionBlock = match[1].trim();
      
      if (questionBlock.length < 10) continue;
      
      const question = this.parseQuestionBlock(questionBlock, questionNumber);
      if (question) {
        questions.push(question);
        questionNumber++;
      }
    }
    
    return questions;
  }

  private parseVietnameseFormat(text: string): Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] {
    const questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Pattern for Vietnamese "Câu" format
    const questionPattern = /(?:^|\n)\s*(?:Câu|Question)\s*(\d+)\s*[:\.]?\s*(.+?)(?=(?:\n\s*(?:Câu|Question)\s*\d+|\n\s*[A-D][\.\)]\s*|$))/gis;
    const matches = text.matchAll(questionPattern);
    
    for (const match of matches) {
      const questionNumber = parseInt(match[1]);
      const questionBlock = match[2].trim();
      
      if (questionBlock.length < 10) continue;
      
      const question = this.parseQuestionBlock(questionBlock, questionNumber);
      if (question) {
        questions.push(question);
      }
    }
    
    return questions;
  }

  private parseAlternativeFormat(text: string): Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] {
    const questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Split by potential question boundaries
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentQuestion = '';
    let currentOptions: string[] = [];
    let questionNumber = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line starts a new question
      if (this.isQuestionStart(line)) {
        // Process previous question if we have one
        if (currentQuestion && currentOptions.length >= 4) {
          const question = this.createQuestionFromParts(currentQuestion, currentOptions, questionNumber - 1);
          if (question) {
            questions.push(question);
          }
        }
        
        // Start new question
        currentQuestion = this.extractQuestionText(line);
        currentOptions = [];
        questionNumber++;
      }
      // Check if this line is an option
      else if (this.isOptionLine(line)) {
        const optionText = this.extractOptionText(line);
        if (optionText && currentOptions.length < 4) {
          currentOptions.push(optionText);
        }
      }
      // If it's not an option and we have a current question, it might be continuation
      else if (currentQuestion && !this.isAnswerLine(line)) {
        currentQuestion += ' ' + line;
      }
    }
    
    // Process the last question
    if (currentQuestion && currentOptions.length >= 4) {
      const question = this.createQuestionFromParts(currentQuestion, currentOptions, questionNumber - 1);
      if (question) {
        questions.push(question);
      }
    }
    
    return questions;
  }

  private parseQuestionBlock(block: string, questionNumber: number): Omit<Question, 'id' | 'createdAt' | 'updatedAt'> | null {
    try {
      // Extract question content and options
      const { questionText, options, correctAnswer } = this.extractQuestionComponents(block);
      
      if (!questionText || options.length < 4) {
        return null;
      }
      
      // Determine category and difficulty
      const category = this.detectCategory(questionText);
      const difficulty = this.detectDifficulty(questionText, options);
      
      return {
        content: questionText.trim(),
        options: options.map(opt => opt.trim()),
        correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
        category,
        difficulty
      };
    } catch (error) {
      console.error(`Error parsing question ${questionNumber}:`, error);
      return null;
    }
  }

  private extractQuestionComponents(block: string): {
    questionText: string;
    options: string[];
    correctAnswer: number;
  } {
    // Remove question number if present at the start
    let cleanBlock = block.replace(/^\d+[\.\)]\s*/, '').trim();
    
    // Find where options start
    const optionStartPattern = /[A-D][\.\)]\s*/i;
    const optionStartMatch = cleanBlock.search(optionStartPattern);
    
    let questionText = '';
    let optionsText = '';
    
    if (optionStartMatch !== -1) {
      questionText = cleanBlock.substring(0, optionStartMatch).trim();
      optionsText = cleanBlock.substring(optionStartMatch);
    } else {
      // Try to split by common patterns
      const lines = cleanBlock.split('\n').map(line => line.trim());
      const questionLines: string[] = [];
      const optionLines: string[] = [];
      
      let foundFirstOption = false;
      
      for (const line of lines) {
        if (this.isOptionLine(line)) {
          foundFirstOption = true;
          optionLines.push(line);
        } else if (!foundFirstOption && !this.isAnswerLine(line)) {
          questionLines.push(line);
        }
      }
      
      questionText = questionLines.join(' ').trim();
      optionsText = optionLines.join('\n');
    }
    
    // Extract options
    const options = this.extractOptions(optionsText);
    
    // Detect correct answer
    const correctAnswer = this.detectCorrectAnswer(block, options);
    
    return { questionText, options, correctAnswer };
  }

  private extractOptions(optionsText: string): string[] {
    const options: string[] = [];
    
    // Multiple patterns for option extraction
    const patterns = [
      /([A-D])[\.\)]\s*([^A-D\n]+?)(?=[A-D][\.\)]|$)/gi,
      /([A-D])\s*[\.\)]\s*([^A-D\n]+?)(?=[A-D]\s*[\.\)]|$)/gi,
      /([A-D])\s*[:\-]\s*([^A-D\n]+?)(?=[A-D]\s*[:\-]|$)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = [...optionsText.matchAll(pattern)];
      if (matches.length >= 4) {
        return matches.slice(0, 4).map(match => match[2].trim());
      }
    }
    
    // Fallback: split by lines and look for option-like patterns
    const lines = optionsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const optionLines = lines.filter(line => /^[A-D][\.\)\s]/i.test(line));
    
    if (optionLines.length >= 4) {
      return optionLines.slice(0, 4).map(line => 
        line.replace(/^[A-D][\.\)\s]*/i, '').trim()
      );
    }
    
    return options;
  }

  private isQuestionStart(line: string): boolean {
    return /^\d+[\.\)]\s*\w/.test(line) || 
           /^(?:Question|Câu)\s*\d*\s*[:\.]?\s*\w/i.test(line);
  }

  private isOptionLine(line: string): boolean {
    return /^[A-D][\.\)\s]/i.test(line);
  }

  private isAnswerLine(line: string): boolean {
    return /(?:Đáp án|Answer|Correct|Chọn)\s*[:\-]?\s*[A-D]/i.test(line);
  }

  private extractQuestionText(line: string): string {
    return line.replace(/^\d+[\.\)]\s*/, '')
               .replace(/^(?:Question|Câu)\s*\d*\s*[:\.]?\s*/i, '')
               .trim();
  }

  private extractOptionText(line: string): string {
    return line.replace(/^[A-D][\.\)\s]*/i, '').trim();
  }

  private createQuestionFromParts(
    questionText: string, 
    options: string[], 
    questionNumber: number
  ): Omit<Question, 'id' | 'createdAt' | 'updatedAt'> | null {
    if (!questionText || options.length < 4) {
      return null;
    }
    
    const category = this.detectCategory(questionText);
    const difficulty = this.detectDifficulty(questionText, options);
    
    return {
      content: questionText.trim(),
      options: options.slice(0, 4).map(opt => opt.trim()),
      correctAnswer: 0, // Default to first option
      category,
      difficulty
    };
  }

  private detectCorrectAnswer(block: string, options: string[]): number {
    // Enhanced answer detection patterns
    const answerPatterns = [
      /(?:Đáp án|Answer|Correct|Chọn)\s*[:\-]?\s*([A-D])/i,
      /(?:Key|Đ[aá]p [aá]n)\s*[:\-]?\s*([A-D])/i,
      /\*\s*([A-D])\s*\*/g,
      /\b([A-D])\s*\(correct\)/i,
      /\b([A-D])\s*✓/g,
      /\b([A-D])\s*\[correct\]/i
    ];
    
    for (const pattern of answerPatterns) {
      const match = block.match(pattern);
      if (match) {
        const letter = match[1].toUpperCase();
        const index = letter.charCodeAt(0) - 65; // Convert A,B,C,D to 0,1,2,3
        if (index >= 0 && index < 4) {
          return index;
        }
      }
    }
    
    // Look for emphasized text in options (bold, asterisk, etc.)
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      if (option.includes('**') || 
          option.includes('*') || 
          option.includes('___') ||
          option.includes('CORRECT') ||
          option.includes('✓')) {
        return i;
      }
    }
    
    // Look for longer options (sometimes correct answers are more detailed)
    const avgLength = options.reduce((sum, opt) => sum + opt.length, 0) / options.length;
    for (let i = 0; i < options.length; i++) {
      if (options[i].length > avgLength * 1.5) {
        return i;
      }
    }
    
    return -1; // Not detected
  }

  private detectCategory(questionContent: string): string {
    const categoryKeywords = {
      'Địa lý': [
        'địa lý', 'thủ đô', 'tỉnh', 'thành phố', 'sông', 'núi', 'biển', 'đại dương',
        'châu lục', 'quốc gia', 'vùng', 'miền', 'geography', 'capital', 'mountain',
        'river', 'ocean', 'continent', 'climate', 'khí hậu', 'địa hình'
      ],
      'Lịch sử': [
        'lịch sử', 'năm', 'thế kỷ', 'chiến tranh', 'cách mạng', 'vua', 'chúa',
        'triều đại', 'history', 'war', 'revolution', 'dynasty', 'emperor',
        'independence', 'độc lập', 'giải phóng', 'kháng chiến'
      ],
      'Văn học': [
        'văn học', 'tác giả', 'tác phẩm', 'thơ', 'truyện', 'tiểu thuyết',
        'literature', 'author', 'poem', 'novel', 'story', 'nhà văn',
        'nhà thơ', 'sách', 'chương', 'đoạn văn'
      ],
      'Khoa học': [
        'khoa học', 'vật lý', 'hóa học', 'sinh học', 'toán học', 'physics',
        'chemistry', 'biology', 'mathematics', 'science', 'công thức',
        'định luật', 'thí nghiệm', 'phản ứng', 'nguyên tố'
      ],
      'Kinh tế': [
        'kinh tế', 'tiền tệ', 'thương mại', 'economics', 'business', 'trade',
        'market', 'thị trường', 'đầu tư', 'investment', 'GDP', 'lạm phát',
        'xuất khẩu', 'nhập khẩu'
      ],
      'Văn hóa': [
        'văn hóa', 'lễ hội', 'truyền thống', 'culture', 'tradition', 'festival',
        'tôn giáo', 'religion', 'phong tục', 'tập quán', 'nghệ thuật', 'art'
      ],
      'Công nghệ': [
        'công nghệ', 'máy tính', 'internet', 'technology', 'computer', 'software',
        'phần mềm', 'ứng dụng', 'website', 'mạng', 'network', 'AI', 'robot'
      ],
      'Y học': [
        'y học', 'bệnh', 'thuốc', 'bác sĩ', 'bệnh viện', 'medicine', 'doctor',
        'hospital', 'disease', 'treatment', 'điều trị', 'chẩn đoán', 'virus'
      ],
      'Thể thao': [
        'thể thao', 'bóng đá', 'bóng rổ', 'tennis', 'sport', 'football',
        'basketball', 'Olympic', 'vận động viên', 'athlete', 'thi đấu'
      ]
    };
    
    const lowerContent = questionContent.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
        return category;
      }
    }
    
    return 'Tổng hợp';
  }

  private detectDifficulty(questionContent: string, options: string[]): 'easy' | 'medium' | 'hard' {
    const contentLength = questionContent.length;
    const avgOptionLength = options.reduce((sum, opt) => sum + opt.length, 0) / options.length;
    const totalLength = contentLength + avgOptionLength * options.length;
    
    // Count complex indicators
    let complexityScore = 0;
    
    // Long content indicates complexity
    if (contentLength > 200) complexityScore += 2;
    else if (contentLength > 100) complexityScore += 1;
    
    // Long options indicate complexity
    if (avgOptionLength > 50) complexityScore += 2;
    else if (avgOptionLength > 25) complexityScore += 1;
    
    // Technical terms or numbers
    const technicalPatterns = [
      /\d{4}/, // Years
      /\d+%/, // Percentages
      /[A-Z]{2,}/, // Acronyms
      /[α-ωΑ-Ω]/, // Greek letters
      /\b(?:theo|according|based on|phụ thuộc)\b/i, // Dependency words
      /\b(?:ngoại trừ|except|excluding|trừ)\b/i, // Exception words
    ];
    
    technicalPatterns.forEach(pattern => {
      if (pattern.test(questionContent)) {
        complexityScore += 1;
      }
    });
    
    // Multiple correct-looking answers (all options are substantial)
    const substantialOptions = options.filter(opt => opt.length > 15).length;
    if (substantialOptions >= 3) complexityScore += 1;
    
    // Determine difficulty based on complexity score
    if (complexityScore >= 4) return 'hard';
    if (complexityScore >= 2) return 'medium';
    return 'easy';
  }

  private validateAndCleanQuestions(questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]): Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] {
    return questions.filter(question => {
      // Basic validation
      if (!question.content || question.content.trim().length < 5) return false;
      if (!question.options || question.options.length !== 4) return false;
      if (question.options.some(opt => !opt || opt.trim().length < 1)) return false;
      if (question.correctAnswer < 0 || question.correctAnswer > 3) return false;
      
      // Clean up the question
      question.content = this.cleanQuestionText(question.content);
      question.options = question.options.map(opt => this.cleanQuestionText(opt));
      
      return true;
    });
  }

  private cleanQuestionText(text: string): string {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove common PDF artifacts
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF.,;:!?()\[\]{}""''`~@#$%^&*+=<>\/\\|-]/g, '')
      // Clean up punctuation
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/([.,;:!?])\s*([.,;:!?])/g, '$1')
      .trim();
  }

  // Enhanced validation method
  validateQuestions(questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]): {
    valid: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
    invalid: { question: any; errors: string[] }[];
  } {
    const valid: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const invalid: { question: any; errors: string[] }[] = [];
    
    for (const question of questions) {
      const errors: string[] = [];
      
      // Content validation
      if (!question.content || question.content.trim().length < 5) {
        errors.push('Nội dung câu hỏi quá ngắn (tối thiểu 5 ký tự)');
      }
      
      if (question.content && question.content.length > 1000) {
        errors.push('Nội dung câu hỏi quá dài (tối đa 1000 ký tự)');
      }
      
      // Options validation
      if (!question.options || question.options.length !== 4) {
        errors.push('Phải có đúng 4 phương án trả lời');
      } else {
        question.options.forEach((option, index) => {
          if (!option || option.trim().length < 1) {
            errors.push(`Phương án ${String.fromCharCode(65 + index)} không được để trống`);
          }
          if (option && option.length > 500) {
            errors.push(`Phương án ${String.fromCharCode(65 + index)} quá dài (tối đa 500 ký tự)`);
          }
        });
        
        // Check for duplicate options
        const uniqueOptions = new Set(question.options.map(opt => opt.trim().toLowerCase()));
        if (uniqueOptions.size < question.options.length) {
          errors.push('Các phương án trả lời không được trùng lặp');
        }
      }
      
      // Correct answer validation
      if (question.correctAnswer < 0 || question.correctAnswer > 3) {
        errors.push('Đáp án đúng phải từ 0-3 (A-D)');
      }
      
      // Category validation
      if (question.category && question.category.length > 100) {
        errors.push('Tên danh mục quá dài (tối đa 100 ký tự)');
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