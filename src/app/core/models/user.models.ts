import { RoleCode,Role } from './auth.models';

export interface UserCompanyRole {
  roleCode: RoleCode;
  companyId: string | null;
  company?: {
    id: string;
    name: string;
    companyKind: string;
  } | null;
}

export interface UserListItem {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  emailConfirmed: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  roles: UserCompanyRole[];
}

export interface UserCreateOptions {
  roles: Role[];
  companies: UserCreateCompanyOption[];
}

export interface UserCreateCompanyOption {
  id: string;
  name: string;
  companyKind: 'WAREHOUSE' | 'CUSTOMER' | 'SUPPLIER' | 'CARRIER' | 'OTHER';
}

export interface CreateUserRequest {
  username: string;
  name: string;
  surname: string;
  email: string;
  roleCode: RoleCode;
  companyId?: string | null;
  temporaryPassword?: string;
  sendVerificationEmail?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  name?: string;
  surname?: string;
  email?: string;
  emailConfirmed?: boolean;
}

export interface UpdateUserRoleRequest {
  roleCode: RoleCode;
  companyId?: string | null;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  username: string;
  temporaryPassword?: string;
}