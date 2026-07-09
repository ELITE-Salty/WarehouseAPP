import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import {
  ApiDataResponse,
  ApiListResponse,
  ApiSuccessResponse,
} from '../models/api-response.models';
import {
  CompanyItem,
  CreateCompanyContactRequest,
  CreateCompanyRequest,
  UpdateCompanyContactRequest,
  UpdateCompanyRequest,
} from '../models/company.models';

@Injectable({
  providedIn: 'root',
})
export class CompaniesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${APP_CONFIG.apiBaseUrl}/companies`;

  getCompanies(filters?: { q?: string }) {
    let params = new HttpParams();

    if (filters?.q) {
      params = params.set('q', filters.q);
    }

    return this.http.get<ApiListResponse<CompanyItem>>(this.baseUrl, {
      params,
    });
  }

  getCompany(companyId: string) {
    return this.http.get<ApiDataResponse<CompanyItem>>(
      `${this.baseUrl}/${companyId}`,
    );
  }

  createCompany(payload: CreateCompanyRequest) {
    return this.http.post<
      ApiDataResponse<CompanyItem> | ApiSuccessResponse<CompanyItem>
    >(this.baseUrl, payload);
  }

  updateCompany(companyId: string, payload: UpdateCompanyRequest) {
    return this.http.patch<
      ApiDataResponse<CompanyItem> | ApiSuccessResponse<CompanyItem>
    >(`${this.baseUrl}/${companyId}`, payload);
  }

  setCompanyActive(companyId: string, active: boolean) {
    return this.http.patch<ApiSuccessResponse>(
      `${this.baseUrl}/${companyId}/active`,
      { active },
    );
  }

  createContact(companyId: string, payload: CreateCompanyContactRequest) {
    return this.http.post<ApiSuccessResponse>(
      `${this.baseUrl}/${companyId}/contacts`,
      payload,
    );
  }

  updateContact(
    companyId: string,
    contactId: string,
    payload: UpdateCompanyContactRequest,
  ) {
    return this.http.patch<ApiSuccessResponse>(
      `${this.baseUrl}/${companyId}/contacts/${contactId}`,
      payload,
    );
  }
  
}