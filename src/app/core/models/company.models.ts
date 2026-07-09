export type CompanyKind =
  | 'WAREHOUSE'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'CARRIER'
  | 'OTHER';

export interface CompanyContact {
  id: string;
  name: string;
  surname: string;
  email?: string | null;
  phone?: string | null;
  receivesOrderNotifications: boolean;
  receivesDocumentEmails: boolean;
  receivesLowStockAlerts: boolean;
  active: boolean;
}

export interface LocationModel {
  id?: string;
  name?: string | null;

  street: string;

  postCode?: string;
  post_code?: string;

  city: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
}

export interface CompanyItem {
  id: string;
  name: string;

  companyKind?: CompanyKind | null;
  company_kind?: CompanyKind | null;

  legalName?: string | null;
  legal_name?: string | null;

  shortName?: string | null;
  short_name?: string | null;

  vatNumber?: string | null;
  vat_number?: string | null;

  registrationNumber?: string | null;
  registration_number?: string | null;

  eoriNumber?: string | null;
  eori_number?: string | null;

  iban?: string | null;
  bic?: string | null;

  bankName?: string | null;
  bank_name?: string | null;

  email?: string | null;
  phone?: string | null;
  website?: string | null;
  active?: boolean;

  location?: LocationModel | null;
  contacts?: CompanyContact[];

  createdAt?: string;
  created_at?: string;

  updatedAt?: string;
  updated_at?: string;
}

export interface UpdateCompanyContactRequest {
  name?: string;
  surname?: string;
  email?: string | null;
  phone?: string | null;
  receivesOrderNotifications?: boolean;
  receivesDocumentEmails?: boolean;
  receivesLowStockAlerts?: boolean;
  active?: boolean;
}

export interface CreateCompanyRequest {
  name: string;
  companyKind: CompanyKind;
  legalName?: string | null;
  shortName?: string | null;
  vatNumber?: string | null;
  registrationNumber?: string | null;
  eoriNumber?: string | null;
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  active?: boolean;
  location?: LocationModel | null;
}

export interface UpdateCompanyRequest extends Partial<CreateCompanyRequest> {}

export interface CreateCompanyContactRequest {
  name: string;
  surname: string;
  email?: string | null;
  phone?: string | null;
  receivesOrderNotifications?: boolean;
  receivesDocumentEmails?: boolean;
  receivesLowStockAlerts?: boolean;
  active?: boolean;
}