import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { finalize, switchMap, of } from 'rxjs';
import {
  CompanyItem,
  CompanyKind,
  CreateCompanyRequest,
} from '../../core/models/company.models';
import { CompaniesService } from '../../core/services/companies.service';
import { ToastService } from '../../core/services/toast.service';

type ActiveFilter = 'all' | 'active' | 'inactive';
type PageSize = 50 | 100 | 150 | 200 | 'all';

interface CompanyCreateForm {
  name: string;
  companyKind: CompanyKind;
  legalName: string;
  shortName: string;
  vatNumber: string;
  registrationNumber: string;
  eoriNumber: string;
  email: string;
  phone: string;
  website: string;
  active: boolean;

  locationName: string;
  street: string;
  postCode: string;
  city: string;
  country: string;

  contactName: string;
  contactSurname: string;
  contactEmail: string;
  contactPhone: string;
  contactOrderNotifications: boolean;
  contactDocumentEmails: boolean;
  contactLowStockAlerts: boolean;
}

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [FormsModule, RouterLink, MatStepperModule],
  templateUrl: './companies.html',
  styleUrl: './companies.scss',
})
export class Companies {
  private readonly companiesService = inject(CompaniesService);
  private readonly toastService = inject(ToastService);

  readonly companies = signal<CompanyItem[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly modalOpen = signal(false);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly modalErrorMessage = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly kindFilter = signal<'all' | CompanyKind>('all');
  readonly activeFilter = signal<ActiveFilter>('all');

  readonly page = signal(1);
  readonly pageSize = signal<number | 'all'>(50);

  readonly companyKinds: CompanyKind[] = [
    'WAREHOUSE',
    'CUSTOMER',
    'SUPPLIER',
    'CARRIER',
    'OTHER',
  ];

  readonly form = signal<CompanyCreateForm>(this.emptyForm());

  readonly filteredCompanies = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const kindFilter = this.kindFilter();
    const activeFilter = this.activeFilter();

    return this.companies().filter((company) => {
      const kind = this.safeCompanyKind(company);
      const active = company.active ?? true;

      const locationText = company.location
        ? `${company.location.street ?? ''} ${company.location.postCode ?? ''} ${company.location.city ?? ''} ${company.location.country ?? ''}`
        : '';

      const matchesSearch =
        !search ||
        (company.name ?? '').toLowerCase().includes(search) ||
        (this.companyLegalName(company) ?? '').toLowerCase().includes(search) ||
        (this.companyShortName(company) ?? '').toLowerCase().includes(search) ||
        (this.companyVatNumber(company) ?? '').toLowerCase().includes(search) ||
        (company.email ?? '').toLowerCase().includes(search) ||
        (company.phone ?? '').toLowerCase().includes(search) ||
        locationText.toLowerCase().includes(search);

      const matchesKind = kindFilter === 'all' || kind === kindFilter;

      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && active) ||
        (activeFilter === 'inactive' && !active);

      return matchesSearch && matchesKind && matchesActive;
    });
  });

  readonly totalPages = computed(() => {
    const pageSize = this.pageSize();

    if (pageSize === 'all') {
      return 1;
    }

    return Math.max(
      1,
      Math.ceil(this.filteredCompanies().length / pageSize),
    );
  });

  readonly pagedCompanies = computed(() => {
    const pageSize = this.pageSize();

    if (pageSize === 'all') {
      return this.filteredCompanies();
    }

    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * pageSize;

    return this.filteredCompanies().slice(start, start + pageSize);
  });

  readonly showingFrom = computed(() => {
    const pageSize = this.pageSize();

    if (this.filteredCompanies().length === 0) {
      return 0;
    }

    if (pageSize === 'all') {
      return 1;
    }

    return (this.page() - 1) * pageSize + 1;
  });

  readonly showingTo = computed(() => {
    const pageSize = this.pageSize();

    if (pageSize === 'all') {
      return this.filteredCompanies().length;
    }

    return Math.min(
      this.page() * pageSize,
      this.filteredCompanies().length,
    );
  });

  constructor() {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading.set(true);

    this.companiesService
      .getCompanies()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.companies.set(response.data ?? []);
        },
        error: (error) => {
          console.error(error);
          this.toastService.error(this.extractErrorMessage(error));
        },
      });
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  updateKindFilter(value: 'all' | CompanyKind): void {
    this.kindFilter.set(value);
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
    this.kindFilter.set('all');
    this.activeFilter.set('all');
    this.page.set(1);
  }

  openCreateModal(): void {
    this.fieldErrors.set({});
    this.modalErrorMessage.set(null);
    this.form.set(this.emptyForm());
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) {
      return;
    }

    this.modalOpen.set(false);
    this.fieldErrors.set({});
    this.modalErrorMessage.set(null);
  }

  patchForm(value: Partial<CompanyCreateForm>): void {
    this.form.update((current) => ({
      ...current,
      ...value,
    }));

    this.fieldErrors.update((errors) => {
      const next = { ...errors };

      for (const field of Object.keys(value)) {
        delete next[field];
      }

      return next;
    });
  }

  createCompany(): void {
    this.fieldErrors.set({});
    this.modalErrorMessage.set(null);

    const form = this.form();

    if (!this.validateCreateForm(form)) {
      return;
    }

    this.saving.set(true);

    this.companiesService
      .createCompany(this.toCreatePayload(form))
      .pipe(
        switchMap((response: any) => {
          const createdCompany: CompanyItem | undefined =
            response?.data ?? response;

          const companyId = createdCompany?.id;

          if (!companyId || !this.hasContactData(form)) {
            return of(response);
          }

          return this.companiesService.createContact(companyId, {
            name: form.contactName.trim(),
            surname: form.contactSurname.trim(),
            email: this.optionalString(form.contactEmail),
            phone: this.optionalString(form.contactPhone),
            receivesOrderNotifications: form.contactOrderNotifications,
            receivesDocumentEmails: form.contactDocumentEmails,
            receivesLowStockAlerts: form.contactLowStockAlerts,
            active: true,
          });
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Podjetje je bilo dodano.');
          this.modalOpen.set(false);
          this.loadCompanies();
        },
        error: (error) => {
          console.error(error);
          const message = this.extractErrorMessage(error);
          this.modalErrorMessage.set(message);
          this.toastService.error(message);
        },
      });
  }

  setActive(company: CompanyItem, active: boolean): void {
    this.companiesService.setCompanyActive(company.id, active).subscribe({
      next: (response) => {
        this.toastService.success(
          response.message ??
            (active ? 'Podjetje je aktivirano.' : 'Podjetje je deaktivirano.'),
        );
        this.loadCompanies();
      },
      error: (error) => {
        console.error(error);
        this.toastService.error(this.extractErrorMessage(error));
      },
    });
  }

  safeCompanyKind(company: CompanyItem): CompanyKind {
    return company.companyKind ?? 'OTHER';
  }

  companyKindClass(company: CompanyItem): string {
    return `kind-${this.safeCompanyKind(company).toLowerCase()}`;
  }

  companyKindLabel(kind: CompanyKind | null | undefined): string {
    const labels: Record<CompanyKind, string> = {
      WAREHOUSE: 'Skladiščno podjetje',
      CUSTOMER: 'Naročnik',
      SUPPLIER: 'Dobavitelj',
      CARRIER: 'Prevoznik',
      OTHER: 'Drugo',
    };

    return labels[kind ?? 'OTHER'];
  }

  locationLabel(company: CompanyItem): string {
    if (!company.location) {
      return '-';
    }

    return [
      company.location.street,
      company.location.postCode,
      company.location.city,
      company.location.country,
    ]
      .filter(Boolean)
      .join(', ');
  }

  fieldError(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  private validateCreateForm(form: CompanyCreateForm): boolean {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors['name'] = 'Naziv podjetja je obvezen.';
    }

    if (!form.companyKind) {
      errors['companyKind'] = 'Tip podjetja je obvezen.';
    }

    const hasAnyLocation =
      form.locationName.trim() ||
      form.street.trim() ||
      form.postCode.trim() ||
      form.city.trim() ||
      form.country.trim();

    if (hasAnyLocation) {
      if (!form.street.trim()) {
        errors['street'] = 'Ulica je obvezna.';
      }

      if (!form.postCode.trim()) {
        errors['postCode'] = 'Poštna številka je obvezna.';
      }

      if (!form.city.trim()) {
        errors['city'] = 'Mesto je obvezno.';
      }

      if (!form.country.trim()) {
        errors['country'] = 'Država je obvezna.';
      }
    }

    const hasAnyContact = this.hasContactData(form);

    if (hasAnyContact) {
      if (!form.contactName.trim()) {
        errors['contactName'] = 'Ime kontakta je obvezno.';
      }

      if (!form.contactSurname.trim()) {
        errors['contactSurname'] = 'Priimek kontakta je obvezen.';
      }
    }

    this.fieldErrors.set(errors);

    if (Object.keys(errors).length > 0) {
      this.modalErrorMessage.set('Preverite označena polja.');
      return false;
    }

    return true;
  }

  private toCreatePayload(form: CompanyCreateForm): CreateCompanyRequest {
    return {
      name: form.name.trim(),
      companyKind: form.companyKind,
      legalName: this.optionalString(form.legalName),
      shortName: this.optionalString(form.shortName),
      vatNumber: this.optionalString(form.vatNumber),
      registrationNumber: this.optionalString(form.registrationNumber),
      eoriNumber: this.optionalString(form.eoriNumber),
      email: this.optionalString(form.email),
      phone: this.optionalString(form.phone),
      website: this.optionalString(form.website),
      active: form.active,
      location: this.toLocationPayload(form),
    };
  }

  private toLocationPayload(form: CompanyCreateForm) {
    const hasAnyLocation =
      form.locationName.trim() ||
      form.street.trim() ||
      form.postCode.trim() ||
      form.city.trim() ||
      form.country.trim();

    if (!hasAnyLocation) {
      return null;
    }

    return {
      name: this.optionalString(form.locationName),
      street: form.street.trim(),
      postCode: form.postCode.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
    };
  }

  private hasContactData(form: CompanyCreateForm): boolean {
    return !!(
      form.contactName.trim() ||
      form.contactSurname.trim() ||
      form.contactEmail.trim() ||
      form.contactPhone.trim()
    );
  }

  private optionalString(value: string): string | null {
    const clean = value.trim();
    return clean ? clean : null;
  }

  private emptyForm(): CompanyCreateForm {
    return {
      name: '',
      companyKind: 'CUSTOMER',
      legalName: '',
      shortName: '',
      vatNumber: '',
      registrationNumber: '',
      eoriNumber: '',
      email: '',
      phone: '',
      website: '',
      active: true,

      locationName: '',
      street: '',
      postCode: '',
      city: '',
      country: 'Slovenia',

      contactName: '',
      contactSurname: '',
      contactEmail: '',
      contactPhone: '',
      contactOrderNotifications: true,
      contactDocumentEmails: true,
      contactLowStockAlerts: true,
    };
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

  companyLegalName(company: CompanyItem): string | null {
    return company.legalName ?? company.legal_name ?? null;
  }

  companyShortName(company: CompanyItem): string | null {
    return company.shortName ?? company.short_name ?? null;
  }

  companyVatNumber(company: CompanyItem): string | null {
    return company.vatNumber ?? company.vat_number ?? null;
  }

  companyRegistrationNumber(company: CompanyItem): string | null {
    return company.registrationNumber ?? company.registration_number ?? null;
  }

  companyEoriNumber(company: CompanyItem): string | null {
    return company.eoriNumber ?? company.eori_number ?? null;
  }

  companyBankName(company: CompanyItem): string | null {
    return company.bankName ?? company.bank_name ?? null;
  }

}