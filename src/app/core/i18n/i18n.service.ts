import { Injectable, computed, signal } from '@angular/core';
import { APP_CONFIG, AppLanguage } from '../config/app-config';
import { TRANSLATIONS } from './translations';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly languageSignal = signal<AppLanguage>(this.getInitialLanguage());

  readonly language = this.languageSignal.asReadonly();

  readonly dictionary = computed(() => {
    return TRANSLATIONS[this.languageSignal()];
  });

  setLanguage(language: AppLanguage): void {
    this.languageSignal.set(language);
    localStorage.setItem('warehouse-language', language);
    document.documentElement.lang = language;
  }

  toggleLanguage(): void {
    this.setLanguage(this.languageSignal() === 'sl' ? 'en' : 'sl');
  }

  t(path: string): string {
    const parts = path.split('.');
    let value: unknown = this.dictionary();

    for (const part of parts) {
      if (!value || typeof value !== 'object') {
        return path;
      }

      value = (value as Record<string, unknown>)[part];
    }

    return typeof value === 'string' ? value : path;
  }

  private getInitialLanguage(): AppLanguage {
    const savedLanguage = localStorage.getItem('warehouse-language');

    if (savedLanguage === 'sl' || savedLanguage === 'en') {
      document.documentElement.lang = savedLanguage;
      return savedLanguage;
    }

    document.documentElement.lang = APP_CONFIG.defaultLanguage;
    return APP_CONFIG.defaultLanguage;
  }
}