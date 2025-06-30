import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DialogConfig {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export interface DialogState {
  isOpen: boolean;
  config: DialogConfig;
  resolve?: (result: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialogState = new BehaviorSubject<DialogState>({
    isOpen: false,
    config: { message: '' }
  });

  dialogState$ = this.dialogState.asObservable();

  confirm(config: DialogConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this.dialogState.next({
        isOpen: true,
        config: {
          title: 'Xác nhận',
          confirmText: 'Xác nhận',
          cancelText: 'Hủy',
          ...config
        },
        resolve
      });
    });
  }

  close(result: boolean = false) {
    const currentState = this.dialogState.value;
    if (currentState.resolve) {
      currentState.resolve(result);
    }
    
    this.dialogState.next({
      isOpen: false,
      config: { message: '' }
    });
  }
}