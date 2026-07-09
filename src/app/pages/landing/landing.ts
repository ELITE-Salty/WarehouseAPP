import { Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-landing',
  imports: [],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private readonly i18n = inject(I18nService);
  private readonly darkMode = signal(false);

  readonly currentLanguage = this.i18n.language;

  readonly languageButtonLabel = computed(() => {
    return this.currentLanguage() === 'sl' ? 'EN' : 'SLO';
  });

  get isDarkMode(): boolean {
    return this.darkMode();
  }

  constructor() {
    const savedTheme = localStorage.getItem('warehouse-theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

    const shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    this.darkMode.set(shouldUseDark);
    document.documentElement.classList.toggle('dark-theme', shouldUseDark);
  }

  t(path: string): string {
    return this.i18n.t(path);
  }

  toggleLanguage(): void {
    this.i18n.toggleLanguage();
  }

  toggleTheme(): void {
    this.darkMode.update((value) => !value);

    document.documentElement.classList.toggle('dark-theme', this.darkMode());
    localStorage.setItem('warehouse-theme', this.darkMode() ? 'dark' : 'light');
  }
}