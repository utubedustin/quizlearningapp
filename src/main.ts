import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { RouterOutlet, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";

import { HeaderComponent } from "./components/header/header.component";
import { FooterComponent } from "./components/footer/footer.component";
import { HomeComponent } from "./components/home/home.component";
import { ConfirmationDialogComponent } from "./components/confirmation-dialog/confirmation-dialog.component";
import { DialogService, DialogState } from "./services/dialog.service";
import { LoadingService } from "./services/loading.service";

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
    FooterComponent,
    ConfirmationDialogComponent,
  ],
  template: `
    <div class="app-layout">
      <app-header></app-header>
      
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
      
      <app-footer></app-footer>

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

      <!-- Global Loading Overlay -->
      <div *ngIf="isLoading" class="global-loading-overlay">
        <div class="global-loading-content">
          <div class="global-loading-spinner"></div>
          <div class="global-loading-text">{{ loadingMessage }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #f8fafc;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .global-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .global-loading-content {
      background: white;
      border-radius: 0.75rem;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      min-width: 200px;
    }

    .global-loading-spinner {
      width: 3rem;
      height: 3rem;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    .global-loading-text {
      font-weight: 500;
      color: #374151;
      font-size: 1.125rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class App {
  dialogState: DialogState = { isOpen: false, config: { message: "" } };
  isLoading = false;
  loadingMessage = "";

  constructor(
    private dialogService: DialogService,
    private loadingService: LoadingService
  ) {
    this.dialogService.dialogState$.subscribe((state) => {
      this.dialogState = state;
    });

    this.loadingService.loading$.subscribe((loading) => {
      this.isLoading = loading;
    });

    this.loadingService.message$.subscribe((message) => {
      this.loadingMessage = message;
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