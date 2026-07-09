import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import {
  StorageListResponse,
  StorageSignedUrlResponse,
} from '../models/storage.models';

import { catchError, map } from 'rxjs';

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

  getObjectAsObjectUrl(key: string) {
    return this.http
      .get(`${this.baseUrl}/object`, {
        params: { key },
        responseType: 'blob',
      })
      .pipe(
        map((blob) => {
          if (blob.size > 0 && blob.type && blob.type !== 'text/plain') {
            return URL.createObjectURL(blob);
          }

          throw new Error('Backend returned text instead of image blob.');
        }),
        catchError(() => {
          return this.http
            .get(`${this.baseUrl}/object`, {
              params: { key },
              responseType: 'text',
            })
            .pipe(
              map((response) => {
                const extracted = this.extractBase64Payload(response, key);
                const blob = this.base64ToBlob(
                  extracted.base64,
                  extracted.mimeType,
                );

                return URL.createObjectURL(blob);
              }),
            );
        }),
      );
  }

  private extractBase64Payload(
    response: string,
    key: string,
  ): { base64: string; mimeType: string } {
    const clean = String(response ?? '').trim();

    if (clean.startsWith('data:')) {
      const commaIndex = clean.indexOf(',');
      const header = clean.substring(0, commaIndex);
      const base64Part = clean.substring(commaIndex + 1);

      return {
        base64: this.cleanBase64(base64Part),
        mimeType:
          header.match(/^data:(.*?);base64$/)?.[1] ??
          this.mimeTypeFromBase64(base64Part) ??
          this.mimeTypeFromKey(key),
      };
    }

    try {
      const parsed = JSON.parse(clean) as {
        data?:
          | string
          | {
              base64?: string;
              content?: string;
              body?: string;
              file?: string;
              contentType?: string;
              content_type?: string;
              mimeType?: string;
              mime_type?: string;
            };
        base64?: string;
        content?: string;
        body?: string;
        file?: string;
        contentType?: string;
        content_type?: string;
        mimeType?: string;
        mime_type?: string;
      };

      if (typeof parsed.data === 'string') {
        return {
          base64: this.cleanBase64(parsed.data),
          mimeType:
            parsed.contentType ??
            parsed.content_type ??
            parsed.mimeType ??
            parsed.mime_type ??
            this.mimeTypeFromBase64(parsed.data) ??
            this.mimeTypeFromKey(key),
        };
      }

      if (typeof parsed.data === 'object' && parsed.data !== null) {
        const base64 =
          parsed.data.base64 ??
          parsed.data.content ??
          parsed.data.body ??
          parsed.data.file ??
          '';

        return {
          base64: this.cleanBase64(base64),
          mimeType:
            parsed.data.contentType ??
            parsed.data.content_type ??
            parsed.data.mimeType ??
            parsed.data.mime_type ??
            parsed.contentType ??
            parsed.content_type ??
            parsed.mimeType ??
            parsed.mime_type ??
            this.mimeTypeFromBase64(base64) ??
            this.mimeTypeFromKey(key),
        };
      }

      const base64 =
        parsed.base64 ?? parsed.content ?? parsed.body ?? parsed.file ?? clean;

      return {
        base64: this.cleanBase64(base64),
        mimeType:
          parsed.contentType ??
          parsed.content_type ??
          parsed.mimeType ??
          parsed.mime_type ??
          this.mimeTypeFromBase64(base64) ??
          this.mimeTypeFromKey(key),
      };
    } catch {
      return {
        base64: this.cleanBase64(clean),
        mimeType: this.mimeTypeFromBase64(clean) ?? this.mimeTypeFromKey(key),
      };
    }
  }

  private cleanBase64(value: string): string {
    let clean = String(value ?? '').trim();

    if (clean.startsWith('data:')) {
      const commaIndex = clean.indexOf(',');
      clean = commaIndex >= 0 ? clean.substring(commaIndex + 1) : clean;
    }

    clean = clean.replace(/^["'`]+|["'`]+$/g, '');

    try {
      clean = decodeURIComponent(clean);
    } catch {
      // Not URL encoded.
    }

    const matches = clean.match(/[A-Za-z0-9+/=_-]{100,}/g);
    if (matches?.length) {
      clean = matches.reduce((longest, current) =>
        current.length > longest.length ? current : longest,
      );
    }

    clean = clean.replace(/\s/g, '');
    clean = clean.replace(/-/g, '+').replace(/_/g, '/');
    clean = clean.replace(/=/g, '');
    clean = clean.replace(/[^A-Za-z0-9+/]/g, '');

    const padding = clean.length % 4;

    if (padding === 2) {
      clean += '==';
    } else if (padding === 3) {
      clean += '=';
    } else if (padding === 1) {
      throw new Error('Invalid base64 payload length.');
    }

    return clean;
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const clean = this.cleanBase64(base64);
    const byteCharacters = window.atob(clean);

    const arrayBuffer = new ArrayBuffer(byteCharacters.length);
    const bytes = new Uint8Array(arrayBuffer);

    for (let index = 0; index < byteCharacters.length; index += 1) {
      bytes[index] = byteCharacters.charCodeAt(index);
    }

    return new Blob([arrayBuffer], {
      type: mimeType,
    });
  }

  private mimeTypeFromBase64(base64: string): string | null {
    const clean = String(base64 ?? '').trim().replace(/\s/g, '');

    if (clean.startsWith('iVBORw0KGgo')) return 'image/png';
    if (clean.startsWith('/9j/')) return 'image/jpeg';
    if (clean.startsWith('UklGR')) return 'image/webp';
    if (clean.startsWith('R0lGOD')) return 'image/gif';
    if (clean.startsWith('JVBERi0')) return 'application/pdf';

    return null;
  }

  private mimeTypeFromKey(key: string): string {
    const lowerKey = key.toLowerCase();

    if (lowerKey.endsWith('.png')) return 'image/png';
    if (lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
    if (lowerKey.endsWith('.webp')) return 'image/webp';
    if (lowerKey.endsWith('.gif')) return 'image/gif';
    if (lowerKey.endsWith('.pdf')) return 'application/pdf';

    return 'application/octet-stream';
  }
}