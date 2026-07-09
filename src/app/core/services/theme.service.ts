import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly themeSignal = signal<AppTheme>(this.getInitialTheme());

  readonly theme = this.themeSignal.asReadonly();

  constructor() {
    this.applyTheme(this.themeSignal());
  }

  toggleTheme(): void {
    const nextTheme: AppTheme = this.themeSignal() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  setTheme(theme: AppTheme): void {
    this.themeSignal.set(theme);
    localStorage.setItem('warehouse-theme', theme);
    this.applyTheme(theme);
  }

  private getInitialTheme(): AppTheme {
    const savedTheme = localStorage.getItem('warehouse-theme');

    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  private applyTheme(theme: AppTheme): void {
    document.documentElement.classList.toggle('dark-theme', theme === 'dark');
  }
}
