export type RoleCode =
  | 'GLOBAL_ADMIN'
  | 'WAREHOUSE_ADMIN'
  | 'WAREHOUSE_WORKER'
  | 'COMPANY_ADMIN'
  | 'COMPANY_USER';

export interface UserRole {
  roleCode: RoleCode;
  companyId: string | null;
}

export interface Role {
  code: RoleCode;
  label: string;
  requiresCompany: boolean;
  allowedCompanyKinds: string[];
}

export interface AuthUser {
  sub: string;
  email: string;
  username: string;
  name: string;
  surname: string;
  roles: UserRole[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}