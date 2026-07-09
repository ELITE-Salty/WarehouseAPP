import { Injectable, signal } from '@angular/core';
import { AuthSession, AuthUser } from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'warehouse-access-token';
const REFRESH_TOKEN_KEY = 'warehouse-refresh-token';
const USER_KEY = 'warehouse-user';

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  private readonly userSignal = signal<AuthUser | null>(this.loadUser());

  readonly user = this.userSignal.asReadonly();

  saveSession(session: AuthSession): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));

    this.userSignal.set(session.user);
  }

  updateTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  updateUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userSignal.set(user);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    this.userSignal.set(null);
  }

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
