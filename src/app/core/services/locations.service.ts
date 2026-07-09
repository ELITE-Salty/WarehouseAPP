import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import { map } from 'rxjs';
import {
  LocationPayload,
  LocationSuggestion,
  LocationValue,
} from '../models/location.models';
import {
  ApiDataResponse,
  ApiListResponse,
  ApiSuccessResponse,
} from '../models/api-response.models';

@Injectable({
  providedIn: 'root',
})
export class LocationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${APP_CONFIG.apiBaseUrl}/locations`;

  suggest(options: {
  q: string;
  country?: string;
  includeOnline?: boolean;
  limit?: number;
}) {
  let params = new HttpParams()
    .set('q', options.q)
    .set('limit', String(options.limit ?? 5));

  if (options.country) {
    params = params.set('country', options.country);
  }

  if (options.includeOnline !== undefined) {
    params = params.set('includeOnline', String(options.includeOnline));
  }

  return this.http
    .get<
      | ApiListResponse<LocationSuggestion>
      | {
          data: {
            query: string;
            local?: LocationSuggestion[];
            geoapify?: LocationSuggestion[];
            usedGeoapify?: boolean;
          };
        }
    >(`${this.baseUrl}/suggest`, { params })
    .pipe(
      map((response) => {
        if (Array.isArray(response.data)) {
          return response.data;
        }

        return [
          ...(response.data.local ?? []),
          ...(response.data.geoapify ?? []),
        ];
      }),
    );
}

  importGeoapifyLocation(payload: LocationPayload) {
    return this.http.post<ApiSuccessResponse | ApiDataResponse<LocationValue>>(
      `${this.baseUrl}/geoapify/import`,
      payload,
    );
  }

  updateLocation(
    id: string,
    payload: { lat?: number | null; lng?: number | null },
  ) {
    return this.http.patch<
      ApiSuccessResponse<LocationValue> | ApiDataResponse<LocationValue>
    >(`${this.baseUrl}/${id}`, payload);
  }
}