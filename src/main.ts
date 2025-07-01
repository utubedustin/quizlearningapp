import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { RouterOutlet, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";

import { HeaderComponent } from "./components/header/header.component";
import { HomeComponent } from "./components/home/home.component";
import { ConfirmationDialogComponent } from "./components/confirmation-dialog/confirmation-dialog.component";
import { DialogService, DialogState } from "./services/dialog.service";

const routes = [
  { path: "", component: HomeComponent },
  {
    path: "questions",
    loadChildren: () =>
      import("./components/question-management.routes").then((m) => m.default),
  },

  // Lazy loaded routes
  {
    path: "study",
    loadChildren: () =>
      import("./components/study.routes").then((m) => m.default),
  },
  {
    path: "practice",
    loadChildren: () =>
      import("./components/practice.routes").then((m) => m.default),
  },
  {
    path: "quiz",
    loadChildren: () =>
      import("./components/quiz.routes").then((m) => m.default),
  },
  {
    path: "results",
    loadChildren: () =>
      import("./components/results.routes").then((m) => m.default),
  },

  { path: "**", redirectTo: "" },
];

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    ConfirmationDialogComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-header></app-header>
      <router-outlet></router-outlet>

      <!-- Global Confirmation Dialog -->
      <app-confirmation-dialog
        [isOpen]="dialogState.isOpen"
        [title]="dialogState.config.title || 'Xác nhận'"
        [message]="dialogState.config.message"
        [confirmText]="dialogState.config.confirmText || 'Xác nhận'"
        [cancelText]="dialogState.config.cancelText || 'Hủy'"
        (confirmed)="onDialogConfirmed()"
        (cancelled)="onDialogCancelled()"
      ></app-confirmation-dialog>
    </div>
  `,
})
export class App {
  dialogState: DialogState = { isOpen: false, config: { message: "" } };

  constructor(private dialogService: DialogService) {
    this.dialogService.dialogState$.subscribe((state) => {
      this.dialogState = state;
    });
  }

  onDialogConfirmed() {
    this.dialogService.close(true);
  }

  onDialogCancelled() {
    this.dialogService.close(false);
  }
}

bootstrapApplication(App, {
  providers: [provideRouter(routes), provideHttpClient()],
});