import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { QuestionService } from "../../services/question.service";
import { QuizSet, QuizResult } from "../../models/question.model";
import { DialogService } from "../../services/dialog.service";

@Component({
  selector: "app-study",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./study.component.html",
  styleUrls: ["./study.component.css"],
})
export class StudyComponent implements OnInit {
  studySets: QuizSet[] = [];
  studyResults: QuizResult[] = [];

  constructor(
    private questionService: QuestionService,
    public router: Router,
    private dialogService: DialogService
  ) {}

  ngOnInit() {
    console.log("StudyComponent ngOnInit");

    // Load study sets
    this.questionService.getQuestions().subscribe((questions) => {
      console.log("Questions loaded for study sets:", questions.length);
      this.studySets = this.questionService.createStudySets();
      console.log("Study sets created:", this.studySets.length);
    });

    // Load study results
    this.questionService.getQuizResults().subscribe((results) => {
      console.log("All quiz results loaded:", results.length);
      this.studyResults = results.filter((r) => r.mode === "study");
      console.log("Study results filtered:", this.studyResults.length);
    });

    // Listen for wrong answers changes to update study sets
    this.questionService.getWrongAnswers().subscribe((wrongAnswers) => {
      console.log("Wrong answers updated:", wrongAnswers.length);
      this.studySets = this.questionService.createStudySets();
    });
  }

  getSetResult(setId: string): QuizResult | undefined {
    const result = this.studyResults.find((r) => {
      console.log(
        "Checking result:",
        r.quizSetId,
        "against",
        setId,
        "match:",
        r.quizSetId === setId
      );
      return r.quizSetId === setId;
    });
    console.log(`Result for ${setId}:`, result);
    return result;
  }

  getCategories(set: QuizSet): string[] {
    if (set._id === 'wrong-answers-set') {
      return ['Câu hỏi sai'];
    }

    const categories = set.questions
      .map((q) => q.category)
      .filter(Boolean)
      .filter((cat, index, arr) => arr.indexOf(cat) === index);

    return categories.length > 0
      ? (categories as string[])
      : ["Chưa phân loại"];
  }

  startStudySet(set: QuizSet) {
    this.router.navigate(["/quiz"], {
      queryParams: {
        mode: "study",
        setId: set._id,
        questions: JSON.stringify(set.questions.map((q) => q._id)),
      },
    });
  }

  reviewStudySet(set: QuizSet) {
    const result = this.getSetResult(set._id);
    if (!result) return;

    // Navigate to results view with the specific result data
    this.router.navigate(["/quiz"], {
      queryParams: {
        mode: "review",
        setId: set._id,
        questions: JSON.stringify(set.questions.map((q) => q._id)),
        resultId: result.id,
      },
    });
  }

  async confirmRetakeStudySet(set: QuizSet) {
    const isWrongAnswersSet = set._id === 'wrong-answers-set';
    const title = isWrongAnswersSet ? "Học lại câu sai" : "Làm lại bài học";
    const message = isWrongAnswersSet 
      ? `Bạn có chắc chắn muốn học lại các câu sai?\n\nCác câu trả lời đúng sẽ được loại bỏ khỏi đề này.`
      : `Bạn có chắc chắn muốn làm lại "${set.name}"?\n\nKết quả hiện tại sẽ bị xóa và bạn sẽ bắt đầu làm bài từ đầu.`;

    const confirmed = await this.dialogService.confirm({
      title,
      message,
      confirmText: "Làm lại",
      cancelText: "Hủy",
    });

    if (confirmed) {
      // Clear the previous result and any saved progress
      this.questionService.clearStudySetResult(set._id);

      // Navigate with retake flag to ensure fresh start
      this.router.navigate(["/quiz"], {
        queryParams: {
          mode: "study",
          setId: set._id,
          questions: JSON.stringify(set.questions.map((q) => q._id)),
          retake: "true"
        },
      });
    }
  }

  async confirmClearWrongAnswers() {
    const confirmed = await this.dialogService.confirm({
      title: "Xóa đề câu hỏi sai",
      message: "Bạn có chắc chắn muốn xóa toàn bộ đề 'Học lại câu sai'?\n\nHành động này không thể hoàn tác.",
      confirmText: "Xóa",
      cancelText: "Hủy",
    });

    if (confirmed) {
      this.questionService.clearWrongAnswers();
      this.questionService.clearStudySetResult('wrong-answers-set');
      
      // Refresh study sets
      this.studySets = this.questionService.createStudySets();
    }
  }
}