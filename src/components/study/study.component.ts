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
    const confirmed = await this.dialogService.confirm({
      title: "Làm lại bài học",
      message: `Bạn có chắc chắn muốn làm lại "${set.name}"?\n\nKết quả hiện tại sẽ bị xóa và bạn sẽ bắt đầu làm bài từ đầu.`,
      confirmText: "Làm lại",
      cancelText: "Hủy",
    });

    if (confirmed) {
      // Clear the previous result
      this.questionService.clearStudySetResult(set._id);

      // Start the quiz fresh
      this.startStudySet(set);
    }
  }
}
