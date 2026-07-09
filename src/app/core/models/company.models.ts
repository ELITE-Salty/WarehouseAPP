export type CompanyKind =
  | 'WAREHOUSE'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'CARRIER'
  | 'OTHER';

export interface LocationModel {
  id?: string;
  name?: string | null;
  street: string;
  postCode: string;
  city: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
}

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

export interface CompanyItem {
  id: string;
  name: string;
  companyKind?: CompanyKind | null;
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
  contacts?: CompanyContact[];
  createdAt?: string;
  updatedAt?: string;
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