import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="nav">
      <div class="container">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-bold text-primary">Quiz App</h1>
          </div>
          
          <div class="nav-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
              Trang chủ
            </a>
            <a routerLink="/questions" routerLinkActive="active" class="nav-link">
              Quản lý câu hỏi
            </a>
            <a routerLink="/study" routerLinkActive="active" class="nav-link">
              Học bài
            </a>
            <a routerLink="/practice" routerLinkActive="active" class="nav-link">
              Luyện thi
            </a>
            <a routerLink="/results" routerLinkActive="active" class="nav-link">
              Kết quả
            </a>
          </div>
        </div>
      </div>
    </nav>
  `
})
export class HeaderComponent {}