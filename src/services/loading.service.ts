import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private messageSubject = new BehaviorSubject<string>('');

  loading$ = this.loadingSubject.asObservable();
  message$ = this.messageSubject.asObservable();

  show(message: string = 'Đang tải...') {
    this.messageSubject.next(message);
    this.loadingSubject.next(true);
  }

  hide() {
    this.loadingSubject.next(false);
    this.messageSubject.next('');
  }

  get isLoading(): boolean {
    return this.loadingSubject.value;
  }
}