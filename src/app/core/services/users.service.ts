import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import {
  ApiListResponse,
  ApiSuccessResponse,
} from '../models/api-response.models';
import {
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  UserCreateOptions,
  UserListItem,
} from '../models/user.models';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${APP_CONFIG.apiBaseUrl}/users`;

  getUsers() {
    return this.http.get<ApiListResponse<UserListItem>>(this.baseUrl);
  }

  getCreateOptions() {
    return this.http.get<UserCreateOptions | { data: UserCreateOptions }>(
      `${this.baseUrl}/create-options`,
    ).pipe(
      map((response) => {
        if ('data' in response) {
          return response.data;
        }

        return response;
      }),
    );
  }

  createUser(payload: CreateUserRequest) {
    return this.http.post<ApiSuccessResponse<CreateUserResponse>>(
      this.baseUrl,
      payload,
    );
  }

  updateUser(userId: string, payload: UpdateUserRequest) {
    return this.http.patch<ApiSuccessResponse<UserListItem>>(
      `${this.baseUrl}/${userId}`,
      payload,
    );
  }

  updateUserRole(userId: string, payload: UpdateUserRoleRequest) {
    return this.http.patch<ApiSuccessResponse<UserListItem>>(
      `${this.baseUrl}/${userId}/role`,
      payload,
    );
  }

  setUserActive(userId: string, active: boolean) {
    return this.http.patch<ApiSuccessResponse>(
      `${this.baseUrl}/${userId}/active`,
      { active },
    );
  }

  deleteUser(userId: string) {
    return this.http.delete<ApiSuccessResponse>(`${this.baseUrl}/${userId}`);
  }

  resendVerification(userId: string) {
    return this.http.post<ApiSuccessResponse>(
      `${this.baseUrl}/${userId}/resend-verification`,
      {},
    );
  }
}