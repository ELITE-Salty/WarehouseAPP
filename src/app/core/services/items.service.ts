import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import {
  AddExternalBarcodeRequest,
  CreateItemRequest,
  ItemListItem,
  ItemOptions,
  UpdateItemRequest,
} from '../models/item.models';
import {
  ApiDataResponse,
  ApiListResponse,
  ApiSuccessResponse,
} from '../models/api-response.models';

@Injectable({
  providedIn: 'root',
})
export class ItemsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${APP_CONFIG.apiBaseUrl}/items`;

  getItems(filters?: {
    q?: string;
    companyId?: string;
    categoryId?: string;
    active?: boolean | null;
  }) {
    let params = new HttpParams();

    if (filters?.q) params = params.set('q', filters.q);
    if (filters?.companyId) params = params.set('companyId', filters.companyId);
    if (filters?.categoryId) params = params.set('categoryId', filters.categoryId);
    if (filters?.active !== undefined && filters.active !== null) {
      params = params.set('active', String(filters.active));
    }

    return this.http.get<ApiListResponse<ItemListItem>>(this.baseUrl, { params });
  }

  getOptions(companyId?: string) {
    let params = new HttpParams();

    if (companyId) {
      params = params.set('companyId', companyId);
    }

    return this.http.get<ApiDataResponse<ItemOptions> | ItemOptions>(
      `${this.baseUrl}/options`,
      { params },
    );
  }

  getItem(itemId: string) {
    return this.http.get<ApiDataResponse<ItemListItem>>(`${this.baseUrl}/${itemId}`);
  }

  findByBarcode(barcode: string) {
    return this.http.get<ApiDataResponse<ItemListItem>>(
      `${this.baseUrl}/by-barcode/${encodeURIComponent(barcode)}`,
    );
  }

  createItem(payload: CreateItemRequest) {
    return this.http.post<ApiDataResponse<ItemListItem> | ApiSuccessResponse>(
      this.baseUrl,
      payload,
    );
  }

  updateItem(itemId: string, payload: UpdateItemRequest) {
    return this.http.patch<ApiDataResponse<ItemListItem> | ApiSuccessResponse>(
      `${this.baseUrl}/${itemId}`,
      payload,
    );
  }

  setItemActive(itemId: string, active: boolean) {
    return this.http.patch<ApiSuccessResponse>(`${this.baseUrl}/${itemId}/active`, {
      active,
    });
  }

  uploadImage(itemId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiDataResponse<ItemListItem> | ApiSuccessResponse>(
      `${this.baseUrl}/${itemId}/image`,
      formData,
    );
  }

  addBarcode(itemId: string, payload: AddExternalBarcodeRequest) {
    return this.http.post<ApiDataResponse<unknown> | ApiSuccessResponse>(
      `${this.baseUrl}/${itemId}/barcodes`,
      payload,
    );
  }

  setBarcodeActive(itemId: string, barcodeId: string, active: boolean) {
    return this.http.patch<ApiSuccessResponse>(
      `${this.baseUrl}/${itemId}/barcodes/${barcodeId}/active`,
      { active },
    );
  }

  deleteBarcode(itemId: string, barcodeId: string) {
    return this.http.delete<ApiSuccessResponse>(
      `${this.baseUrl}/${itemId}/barcodes/${barcodeId}`,
    );
  }
}