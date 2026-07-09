import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { finalize } from 'rxjs';
import {
  CompanyItem,
  CompanyKind,
  UpdateCompanyRequest,
} from '../../core/models/company.models';
import { CompaniesService } from '../../core/services/companies.service';
import { ToastService } from '../../core/services/toast.service';
import { LocationPicker } from '../../shared/location-picker/location-picker';
import { LocationValue } from '../../core/models/location.models';

interface CompanyEditForm {
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
}

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, MatTabsModule, LocationPicker],
  templateUrl: './company-detail.html',
  styleUrl: './company-detail.scss',
})
export class CompanyDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly companiesService = inject(CompaniesService);
  private readonly toastService = inject(ToastService);

  readonly company = signal<CompanyItem | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly pendingLocation = signal<LocationValue | null>(null);

  readonly companyKinds: CompanyKind[] = [
    'WAREHOUSE',
    'CUSTOMER',
    'SUPPLIER',
    'CARRIER',
    'OTHER',
  ];

  readonly form = signal<CompanyEditForm>({
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
  });

  readonly companyId = this.route.snapshot.paramMap.get('id') ?? '';

  constructor() {
    this.loadCompany();
  }

  loadCompany(): void {
    if (!this.companyId) {
      this.errorMessage.set('Manjka ID podjetja.');
      return;
    }

    this.loading.set(true);

    this.companiesService
      .getCompany(this.companyId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const company = response.data;
          this.company.set(company);

          this.form.set({
            name: company.name ?? '',
            companyKind: company.companyKind ?? 'OTHER',
            legalName: company.legalName ?? '',
            shortName: company.shortName ?? '',
            vatNumber: company.vatNumber ?? '',
            registrationNumber: company.registrationNumber ?? '',
            eoriNumber: company.eoriNumber ?? '',
            email: company.email ?? '',
            phone: company.phone ?? '',
            website: company.website ?? '',
            active: company.active ?? true,
          });
        },
        error: (error) => {
          console.error(error);
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  onLocationSelected(location: LocationValue): void {
    this.pendingLocation.set(location);
  }

  savePendingLocation(): void {
    const location = this.pendingLocation();

    if (!location) {
      this.toastService.error('Najprej izberite lokacijo.');
      return;
    }

    this.saving.set(true);

    this.companiesService
      .updateCompany(this.companyId, {
        location: {
          name: location.name ?? null,
          street: location.street,
          postCode: location.postCode,
          city: location.city,
          country: location.country,
          lat: location.lat ?? null,
          lng: location.lng ?? null,
        },
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Lokacija je bila posodobljena.');
          this.pendingLocation.set(null);
          this.loadCompany();
        },
        error: (error) => {
          console.error(error);
          this.toastService.error(this.extractErrorMessage(error));
        },
      });
  }

  pendingLocationLabel(): string {
    const location = this.pendingLocation();

    if (!location) {
      return '';
    }

    return [
      location.name,
      location.street,
      location.postCode,
      location.city,
      location.country,
    ]
      .filter(Boolean)
      .join(', ');
  }

  companyLocationValue(): LocationValue | null {
    const location = this.company()?.location;

    if (!location) {
      return null;
    }

    return {
      id: location.id,
      name: location.name ?? null,
      street: location.street,
      postCode: location.postCode ?? location.post_code ?? '',
      city: location.city,
      country: location.country,
      lat: location.lat ?? null,
      lng: location.lng ?? null,
    };
  }

  patchForm(value: Partial<CompanyEditForm>): void {
    this.form.update((current) => ({
      ...current,
      ...value,
    }));
  }

  saveCompany(): void {
    const form = this.form();

    if (!form.name.trim()) {
      this.toastService.error('Naziv podjetja je obvezen.');
      return;
    }

    const payload: UpdateCompanyRequest = {
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
    };

    this.saving.set(true);

    this.companiesService
      .updateCompany(this.companyId, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Podjetje je bilo posodobljeno.');
          this.loadCompany();
        },
        error: (error) => {
          console.error(error);
          this.toastService.error(this.extractErrorMessage(error));
        },
      });
  }

  companyKindLabel(kind: CompanyKind): string {
    const labels: Record<CompanyKind, string> = {
      WAREHOUSE: 'Skladiščno podjetje',
      CUSTOMER: 'Naročnik',
      SUPPLIER: 'Dobavitelj',
      CARRIER: 'Prevoznik',
      OTHER: 'Drugo',
    };

    return labels[kind];
  }

  private optionalString(value: string): string | null {
    const clean = value.trim();
    return clean ? clean : null;
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

    return 'Prišlo je do napake.';
  }
}