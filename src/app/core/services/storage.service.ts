import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import {
  StorageListResponse,
  StorageSignedUrlResponse,
} from '../models/storage.models';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${APP_CONFIG.apiBaseUrl}/storage`;

  list(prefix: string, maxKeys = 100) {
    const params = new HttpParams()
      .set('prefix', prefix)
      .set('maxKeys', String(maxKeys));

    return this.http.get<StorageListResponse>(`${this.baseUrl}/list`, {
      params,
    });
  }

  signedUrl(key: string, expiresInSeconds = 300) {
    const params = new HttpParams()
      .set('key', key)
      .set('expiresInSeconds', String(expiresInSeconds));

    return this.http.get<StorageSignedUrlResponse>(
      `${this.baseUrl}/signed-url`,
      { params },
    );
  }

  objectUrl(key: string): string {
    return `${this.baseUrl}/object?key=${encodeURIComponent(key)}`;
  }
}