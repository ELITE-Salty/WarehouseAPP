import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import {
  ApiListResponse,
  ApiSuccessResponse,
} from '../models/api-response.models';
import {
  CreateItemCategoryRequest,
  CreateUnitRequest,
  ItemCategory,
  ReferenceDataOptions,
  UnitItem,
  UpdateItemCategoryRequest,
  UpdateUnitRequest,
} from '../models/reference-data.models';

@Injectable({
  providedIn: 'root',
})
export class ReferenceDataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${APP_CONFIG.apiBaseUrl}/reference-data`;

  getOptions() {
    return this.http
      .get<ReferenceDataOptions | { data: ReferenceDataOptions }>(
        `${this.baseUrl}/options`,
      )
      .pipe(
        map((response) => {
          if ('data' in response) {
            return response.data;
          }

          return response;
        }),
      );
  }

  getUnits(filters?: { companyId?: string; q?: string }) {
    let params = new HttpParams();

    if (filters?.companyId) {
      params = params.set('companyId', filters.companyId);
    }

    if (filters?.q) {
      params = params.set('q', filters.q);
    }

    return this.http.get<ApiListResponse<UnitItem>>(`${this.baseUrl}/units`, {
      params,
    });
  }

  createUnit(payload: CreateUnitRequest) {
    return this.http.post<ApiSuccessResponse<UnitItem>>(
      `${this.baseUrl}/units`,
      payload,
    );
  }

  updateUnit(unitId: string, payload: UpdateUnitRequest) {
    return this.http.patch<ApiSuccessResponse<UnitItem>>(
      `${this.baseUrl}/units/${unitId}`,
      payload,
    );
  }

  deleteUnit(unitId: string) {
    return this.http.delete<ApiSuccessResponse>(
      `${this.baseUrl}/units/${unitId}`,
    );
  }

  getCategories(filters?: { companyId?: string; q?: string }) {
    let params = new HttpParams();

    if (filters?.companyId) {
      params = params.set('companyId', filters.companyId);
    }

    if (filters?.q) {
      params = params.set('q', filters.q);
    }

    return this.http.get<ApiListResponse<ItemCategory>>(
      `${this.baseUrl}/item-categories`,
      { params },
    );
  }

  createCategory(payload: CreateItemCategoryRequest) {
    return this.http.post<ApiSuccessResponse<ItemCategory>>(
      `${this.baseUrl}/item-categories`,
      payload,
    );
  }

  updateCategory(categoryId: string, payload: UpdateItemCategoryRequest) {
    return this.http.patch<ApiSuccessResponse<ItemCategory>>(
      `${this.baseUrl}/item-categories/${categoryId}`,
      payload,
    );
  }

  deleteCategory(categoryId: string) {
    return this.http.delete<ApiSuccessResponse>(
      `${this.baseUrl}/item-categories/${categoryId}`,
    );
  }
}