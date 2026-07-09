import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, interval, Subscription } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { AuthSession, LoginRequest, LoginResponse, RoleCode } from '../models/auth.models';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);
  private refreshSubscription?: Subscription;

  readonly currentUser = this.tokenStorage.user;

  readonly isLoggedIn = computed(() => {
    return this.tokenStorage.isLoggedIn();
  });

  readonly roles = computed(() => {
    return this.currentUser()?.roles ?? [];
  });

  readonly roleCodes = computed(() => {
    return this.roles().map((role) => role.roleCode);
  });

  readonly canManageUsers = computed(() => {
    return this.hasAnyRole(['GLOBAL_ADMIN', 'WAREHOUSE_ADMIN', 'COMPANY_ADMIN']);
  });

  readonly canUseWarehouseArea = computed(() => {
    return this.hasAnyRole(['GLOBAL_ADMIN', 'WAREHOUSE_ADMIN', 'WAREHOUSE_WORKER']);
  });

  readonly canManageReferenceData = computed(() => {
    return this.hasAnyRole(['GLOBAL_ADMIN', 'WAREHOUSE_ADMIN', 'COMPANY_ADMIN','COMPANY_USER']);
  });

  readonly canManageBilling = computed(() => {
    return this.hasAnyRole(['GLOBAL_ADMIN', 'WAREHOUSE_ADMIN']);
  });

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${APP_CONFIG.apiBaseUrl}/auth/login`, payload).pipe(
      tap((response) => {
        const session: AuthSession = {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: response.user,
        };

        this.tokenStorage.saveSession(session);
        this.startAutoRefresh();
      }),
    );
  }

  refreshSession(): Observable<LoginResponse> {
    const refreshToken = this.tokenStorage.getRefreshToken();

    if (!refreshToken) {
      throw new Error('Missing refresh token.');
    }

    return this.http
      .post<LoginResponse>(`${APP_CONFIG.apiBaseUrl}/auth/refresh`, {
        refreshToken,
      })
      .pipe(
        tap((response) => {
          this.tokenStorage.updateTokens(response.accessToken, response.refreshToken);

          this.tokenStorage.updateUser(response.user);
        }),
      );
  }

  logout(): void {
    const refreshToken = this.tokenStorage.getRefreshToken();

    if (refreshToken) {
      this.http.post(`${APP_CONFIG.apiBaseUrl}/auth/logout`, { refreshToken }).subscribe({
        next: () => this.forceLogout(),
        error: () => this.forceLogout(),
      });

      return;
    }

    this.forceLogout();
  }

  forceLogout(): void {
    this.tokenStorage.clearSession();
    this.stopAutoRefresh();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  hasRole(roleCode: RoleCode): boolean {
    return this.roleCodes().includes(roleCode);
  }

  hasAnyRole(roleCodes: RoleCode[]): boolean {
    return roleCodes.some((roleCode) => this.hasRole(roleCode));
  }

  startAutoRefresh(): void {
    if (this.refreshSubscription) {
      return;
    }

    this.refreshSubscription = interval(10 * 60 * 1000).subscribe(() => {
      if (!this.tokenStorage.getRefreshToken()) {
        return;
      }

      this.refreshSession().subscribe({
        error: () => {
          this.forceLogout();
        },
      });
    });
  }

  stopAutoRefresh(): void {
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = undefined;
  }
}
