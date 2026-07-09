export interface ReferenceCompanyOption {
  id: string;
  name: string;
  companyKind: 'WAREHOUSE' | 'CUSTOMER' | 'SUPPLIER' | 'CARRIER' | 'OTHER';
}

export interface ReferenceDataOptions {
  companies: ReferenceCompanyOption[];
}

export interface UnitItem {
  id: string;
  companyId: string;
  company?: ReferenceCompanyOption;
  name: string;
  abbreviation: string;
}

export interface CreateUnitRequest {
  companyId: string;
  name: string;
  abbreviation: string;
}

export interface UpdateUnitRequest {
  name?: string;
  abbreviation?: string;
}

export interface ItemCategory {
  id: string;
  companyId: string;
  company?: ReferenceCompanyOption;
  name: string;
  description?: string | null;
}

export interface CreateItemCategoryRequest {
  companyId: string;
  name: string;
  description?: string | null;
}

export interface UpdateItemCategoryRequest {
  name?: string;
  description?: string | null;
}