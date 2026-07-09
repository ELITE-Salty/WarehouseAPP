import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { Role, RoleCode } from '../../core/models/auth.models';
import {
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  UserCreateCompanyOption,
  UserListItem,
} from '../../core/models/user.models';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';

type UserModalMode = 'create' | 'edit';
type ActiveFilter = 'all' | 'active' | 'inactive' | 'unconfirmed';

interface UserFormModel {
  id?: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  emailConfirmed: boolean;
  roleCode: RoleCode;
  companyId: string | null;
  temporaryPassword: string;
  sendVerificationEmail: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersComponent {
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly toastService = inject(ToastService);

  readonly fieldErrors = signal<Record<string, string>>({});
  readonly users = signal<UserListItem[]>([]);
  readonly companies = signal<UserCreateCompanyOption[]>([]);
  readonly roles = signal<Role[]>([]);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly createdTemporaryPassword = signal<string | null>(null);

  readonly modalOpen = signal(false);
  readonly modalMode = signal<UserModalMode>('create');

  readonly searchTerm = signal('');
  readonly roleFilter = signal<'all' | RoleCode>('all');
  readonly companyFilter = signal<'all' | string>('all');
  readonly activeFilter = signal<ActiveFilter>('all');

  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly canManageUsers = this.authService.canManageUsers;

  readonly form = signal<UserFormModel>(this.emptyForm());

  readonly filteredCompanies = computed(() => {
    if (this.form().roleCode === 'GLOBAL_ADMIN') {
      return [];
    }

    return this.companies();
  });

  readonly filteredUsers = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const roleFilter = this.roleFilter();
    const companyFilter = this.companyFilter();
    const activeFilter = this.activeFilter();

    return this.users().filter((user) => {
      const primaryRole = this.normalizeRoleCode(this.primaryRole(user));
      const companyId = user.roles?.[0]?.companyId ?? null;

      const matchesSearch =
        !search ||
        `${user.name} ${user.surname}`.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search) ||
        this.roleLabel(primaryRole).toLowerCase().includes(search) ||
        this.companyLabel(user).toLowerCase().includes(search);

      const matchesRole = roleFilter === 'all' || primaryRole === roleFilter;

      const matchesCompany = companyFilter === 'all' || companyId === companyFilter;

      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && user.active) ||
        (activeFilter === 'inactive' && !user.active) ||
        (activeFilter === 'unconfirmed' && !user.emailConfirmed);

      return matchesSearch && matchesRole && matchesCompany && matchesActive;
    });
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize()));
  });

  readonly pagedUsers = computed(() => {
    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  readonly showingFrom = computed(() => {
    if (this.filteredUsers().length === 0) {
      return 0;
    }

    return (this.page() - 1) * this.pageSize() + 1;
  });

  readonly showingTo = computed(() => {
    return Math.min(this.page() * this.pageSize(), this.filteredUsers().length);
  });

  fieldError(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  private setFieldErrors(errors: Record<string, string>): void {
    this.fieldErrors.set(errors);
  }

  private clearFieldErrors(): void {
    this.fieldErrors.set({});
  }

  private normalizeRoleCode(value: unknown): RoleCode {
    if (typeof value === 'string') {
      return value as RoleCode;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'code' in value &&
      typeof (value as any).code === 'string'
    ) {
      return (value as any).code as RoleCode;
    }

    return 'COMPANY_USER';
  }

  constructor() {
    this.loadPage();
  }

  t(path: string): string {
    return this.i18n.t(path);
  }

  loadPage(): void {
    this.errorMessage.set(null);
    this.loading.set(true);

    forkJoin({
      users: this.usersService.getUsers(),
      options: this.usersService.getCreateOptions(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ users, options }) => {
          this.users.set(users.data);
          this.roles.set(options.roles ?? []);
          this.companies.set(options.companies ?? []);

          if (!this.form().roleCode && options.roles?.length) {
            this.patchForm({ roleCode: options.roles[0].code });
          }

          if (!options.roles?.length) {
            this.errorMessage.set(
              'Vloge niso bile naložene. Preverite /api/users/create-options in dovoljenja uporabnika.',
            );
          }
        },
        error: (error) => {
          console.error(error);
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  openCreateModal(): void {
    this.clearMessages();
    this.clearFieldErrors();
    this.modalMode.set('create');
    this.form.set(this.emptyForm());
    this.modalOpen.set(true);

    if (this.roles().length > 0) {
      this.patchForm({ roleCode: this.roles()[0].code });
    }
  }

  openEditModal(user: UserListItem): void {
    this.clearMessages();
    this.clearFieldErrors();
    this.modalMode.set('edit');

    const role = user.roles?.[0];

    this.form.set({
      id: user.id,
      username: user.username,
      name: user.name,
      surname: user.surname,
      email: user.email,
      emailConfirmed: user.emailConfirmed,
      roleCode: role?.roleCode ?? 'COMPANY_USER',
      companyId: role?.companyId ?? null,
      temporaryPassword: '',
      sendVerificationEmail: false,
    });

    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) {
      return;
    }
    this.clearFieldErrors();
    this.modalOpen.set(false);
  }

  patchForm(value: Partial<UserFormModel>): void {
    this.form.update((current) => {
      const next = {
        ...current,
        ...value,
      };

      if (next.roleCode === 'GLOBAL_ADMIN') {
        next.companyId = null;
      }

      return next;
    });

    const changedFields = Object.keys(value);

    if (changedFields.length > 0) {
      this.fieldErrors.update((errors) => {
        const next = { ...errors };

        for (const field of changedFields) {
          delete next[field];
        }

        if ('roleCode' in value) {
          delete next['companyId'];
        }

        return next;
      });
    }
  }

  saveModal(): void {
    if (this.modalMode() === 'create') {
      this.createUser();
      return;
    }

    this.updateUser();
  }

  createUser(): void {
    this.clearMessages();

    const form = this.form();

    if (!this.validateForm(form)) {
      return;
    }

    const payload: CreateUserRequest = {
      username: form.username.trim(),
      name: form.name.trim(),
      surname: form.surname.trim(),
      email: form.email.trim(),
      roleCode: form.roleCode,
      companyId: form.roleCode === 'GLOBAL_ADMIN' ? null : form.companyId,
      sendVerificationEmail: form.sendVerificationEmail,
    };

    if (form.temporaryPassword.trim()) {
      payload.temporaryPassword = form.temporaryPassword.trim();
    }

    this.saving.set(true);

    this.usersService
      .createUser(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.toastService.success(response.message ?? 'Uporabnik je bil ustvarjen.');

          if (response.data?.temporaryPassword) {
            this.createdTemporaryPassword.set(response.data.temporaryPassword);
          }

          this.modalOpen.set(false);
          this.loadPage();
        },
        error: (error) => {
          console.error(error);
          const message = error.error.message[0];
          this.errorMessage.set(message);
          // this.toastService.error(message);
        },
      });
  }

  updateUser(): void {
    this.clearMessages();

    const form = this.form();

    if (!form.id || !this.validateForm(form)) {
      return;
    }

    const userPayload: UpdateUserRequest = {
      username: form.username.trim(),
      name: form.name.trim(),
      surname: form.surname.trim(),
      email: form.email.trim(),
      emailConfirmed: form.emailConfirmed,
    };

    const rolePayload: UpdateUserRoleRequest = {
      roleCode: form.roleCode,
      companyId: form.roleCode === 'GLOBAL_ADMIN' ? null : form.companyId,
    };

    this.saving.set(true);

    forkJoin({
      user: this.usersService.updateUser(form.id, userPayload),
      role: this.usersService.updateUserRole(form.id, rolePayload),
    })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Uporabnik je bil posodobljen.');
          this.modalOpen.set(false);
          this.loadPage();
        },
        error: (error) => {
          console.error(error);
          const message = error.error.message[0];
          this.errorMessage.set(message);
          // this.toastService.error(message);
        },
      });
  }

  setActive(user: UserListItem, active: boolean): void {
    this.clearMessages();

    this.usersService.setUserActive(user.id, active).subscribe({
      next: (response) => {
        this.toastService.success(response.message ?? 'Uporabnik je bil posodobljen.');
        this.loadPage();
      },
      error: (error) => {
        console.error(error);
        const message = this.extractErrorMessage(error);
        this.errorMessage.set(message);
        // this.toastService.error(message);
      },
    });
  }

  deleteUser(user: UserListItem): void {
    this.clearMessages();

    const confirmed = window.confirm(`Ali res želite izbrisati uporabnika ${user.email}?`);

    if (!confirmed) {
      return;
    }

    this.usersService.deleteUser(user.id).subscribe({
      next: (response) => {
        this.toastService.success(response.message ?? 'Uporabnik je bil izbrisan.');
        this.loadPage();
      },
      error: (error) => {
        console.error(error);
        const message = this.extractErrorMessage(error);
        this.errorMessage.set(message);
        // this.toastService.error(message);
      },
    });
  }

  resendVerification(user: UserListItem): void {
    this.clearMessages();

    this.usersService.resendVerification(user.id).subscribe({
      next: (response) => {
        this.toastService.success(response.message ?? 'Verifikacijska e-pošta je bila poslana.');
      },
      error: (error) => {
        console.error(error);
        const message = error.error.message[0];
        this.errorMessage.set(message);
        // this.toastService.error(message);
      },
    });
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  updateRoleFilter(value: 'all' | RoleCode): void {
    this.roleFilter.set(value === 'all' ? 'all' : this.normalizeRoleCode(value));
    this.page.set(1);
  }

  updateCompanyFilter(value: 'all' | string): void {
    this.companyFilter.set(value);
    this.page.set(1);
  }

  updateActiveFilter(value: ActiveFilter): void {
    this.activeFilter.set(value);
    this.page.set(1);
  }

  updatePageSize(value: string | number): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
  }

  previousPage(): void {
    this.page.update((value) => Math.max(1, value - 1));
  }

  nextPage(): void {
    this.page.update((value) => Math.min(this.totalPages(), value + 1));
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.roleFilter.set('all');
    this.companyFilter.set('all');
    this.activeFilter.set('all');
    this.page.set(1);
  }

  roleLabel(roleCode: RoleCode): string {
    return this.t(`roles.${roleCode}`);
  }

  primaryRole(user: UserListItem): RoleCode {
    return this.normalizeRoleCode(user.roles?.[0]?.roleCode);
  }

  companyLabel(user: UserListItem): string {
    return user.roles?.[0]?.company?.name ?? '-';
  }

  private validateForm(form: UserFormModel): boolean {
    const errors: Record<string, string> = {};

    if (!form.username.trim()) {
      errors['username'] = 'Uporabniško ime je obvezno.';
    }

    if (!form.name.trim()) {
      errors['name'] = 'Ime je obvezno.';
    }

    if (!form.surname.trim()) {
      errors['surname'] = 'Priimek je obvezen.';
    }

    if (!form.email.trim()) {
      errors['email'] = 'E-pošta je obvezna.';
    }

    if (!form.roleCode) {
      errors['roleCode'] = 'Vloga je obvezna.';
    }

    if (form.roleCode !== 'GLOBAL_ADMIN' && !form.companyId) {
      errors['companyId'] = 'Podjetje je obvezno.';
    }

    this.setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      this.errorMessage.set('Preverite označena polja.');
      return false;
    }

    return true;
  }

  private emptyForm(): UserFormModel {
    return {
      username: '',
      name: '',
      surname: '',
      email: '',
      emailConfirmed: false,
      roleCode: 'COMPANY_USER',
      companyId: null,
      temporaryPassword: '',
      sendVerificationEmail: true,
    };
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.createdTemporaryPassword.set(null);
    this.clearFieldErrors();
  }

  private extractErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as any).error?.message === 'string'
    ) {
      return (error as any).error.message;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as any).message === 'string'
    ) {
      return (error as any).message;
    }

    return 'Prišlo je do napake.';
  }

  sendPasswordReset(user: UserListItem): void {
    const confirmed = window.confirm(
      `Pošljem povezavo za ponastavitev gesla na ${user.email}?`,
    );

    if (!confirmed) {
      return;
    }

    this.usersService.sendPasswordReset(user.email).subscribe({
      next: (response) => {
        this.toastService.success(
          response.message ?? 'E-pošta za ponastavitev gesla je bila poslana.',
        );
      },
      error: (error) => {
        const message = this.extractErrorMessage(error);
        this.toastService.error(message);
      },
    });
  }

}
