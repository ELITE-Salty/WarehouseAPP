import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);

  const isAuthRequest =
    request.url.includes('/auth/login') ||
    request.url.includes('/auth/refresh');

  const authRequest = isAuthRequest
    ? request
    : addBearerToken(request, authService.getAccessToken());

  return next(authRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthRequest &&
        request.url.startsWith(APP_CONFIG.apiBaseUrl)
      ) {
        return handle401Error(authRequest, next, authService);
      }

      return throwError(() => error);
    }),
  );
};

function addBearerToken(
  request: HttpRequest<unknown>,
  token: string | null,
): HttpRequest<unknown> {
  if (!token) {
    return request;
  }

  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function handle401Error(
  request: HttpRequest<unknown>,
  next: Parameters<HttpInterceptorFn>[1],
  authService: AuthService,
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshSession().pipe(
      switchMap((response) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);

        return next(addBearerToken(request, response.accessToken));
      }),
      catchError((refreshError) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        authService.forceLogout();

        return throwError(() => refreshError);
      }),
    );
  }

  return refreshTokenSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((token) => {
      return next(addBearerToken(request, token));
    }),
  );
}