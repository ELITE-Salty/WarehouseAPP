import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import {
  CreateItemCategoryRequest,
  CreateUnitRequest,
  ItemCategory,
  ReferenceCompanyOption,
  UnitItem,
  UpdateItemCategoryRequest,
  UpdateUnitRequest,
} from '../../core/models/reference-data.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { ReferenceDataService } from '../../core/services/reference-data.service';

type ReferenceTab = 'units' | 'categories';
type ModalMode = 'create' | 'edit';
type ModalEntity = 'unit' | 'category';

interface UnitFormModel {
  id?: string;
  companyId: string | null;
  name: string;
  abbreviation: string;
}

interface CategoryFormModel {
  id?: string;
  companyId: string | null;
  name: string;
  description: string;
}

@Component({
  selector: 'app-reference-data',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reference-data.html',
  styleUrl: './reference-data.scss',
})
export class ReferenceData {
  private readonly referenceDataService = inject(ReferenceDataService);
  private readonly i18n = inject(I18nService);

  readonly activeTab = signal<ReferenceTab>('units');

  readonly companies = signal<ReferenceCompanyOption[]>([]);
  readonly units = signal<UnitItem[]>([]);
  readonly categories = signal<ItemCategory[]>([]);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly companyFilter = signal<'all' | string>('all');

  readonly modalOpen = signal(false);
  readonly modalMode = signal<ModalMode>('create');
  readonly modalEntity = signal<ModalEntity>('unit');

  readonly fieldErrors = signal<Record<string, string>>({});

  readonly unitForm = signal<UnitFormModel>({
    companyId: null,
    name: '',
    abbreviation: '',
  });

  readonly categoryForm = signal<CategoryFormModel>({
    companyId: null,
    name: '',
    description: '',
  });

  readonly filteredUnits = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const companyFilter = this.companyFilter();

    return this.units().filter((unit) => {
      const matchesSearch =
        !search ||
        unit.name.toLowerCase().includes(search) ||
        unit.abbreviation.toLowerCase().includes(search) ||
        this.companyName(unit.companyId).toLowerCase().includes(search);

      const matchesCompany =
        companyFilter === 'all' || unit.companyId === companyFilter;

      return matchesSearch && matchesCompany;
    });
  });

  readonly filteredCategories = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const companyFilter = this.companyFilter();

    return this.categories().filter((category) => {
      const matchesSearch =
        !search ||
        category.name.toLowerCase().includes(search) ||
        (category.description ?? '').toLowerCase().includes(search) ||
        this.companyName(category.companyId).toLowerCase().includes(search);

      const matchesCompany =
        companyFilter === 'all' || category.companyId === companyFilter;

      return matchesSearch && matchesCompany;
    });
  });

  readonly effectiveCompanies = computed(() => {
    const byId = new Map<string, ReferenceCompanyOption>();

    for (const company of this.companies()) {
      byId.set(company.id, company);
    }

    // The options endpoint can under-report companies for
    // warehouse/global users, so also fall back to the company embedded
    // on each unit/category, which the backend fills in correctly.
    for (const unit of this.units()) {
      if (unit.company && !byId.has(unit.company.id)) {
        byId.set(unit.company.id, unit.company);
      }
    }

    for (const category of this.categories()) {
      if (category.company && !byId.has(category.company.id)) {
        byId.set(category.company.id, category.company);
      }
    }

    return [...byId.values()];
  });

  readonly modalTitle = computed(() => {
    if (this.modalEntity() === 'unit') {
      return this.modalMode() === 'create' ? 'Dodaj enoto' : 'Uredi enoto';
    }

    return this.modalMode() === 'create'
      ? 'Dodaj kategorijo'
      : 'Uredi kategorijo';
  });

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
      options: this.referenceDataService.getOptions(),
      units: this.referenceDataService.getUnits(),
      categories: this.referenceDataService.getCategories(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ options, units, categories }) => {
          this.companies.set(options.companies ?? []);
          this.units.set(units.data ?? []);
          this.categories.set(categories.data ?? []);
        },
        error: (error) => {
          console.error(error);
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  setTab(tab: ReferenceTab): void {
    this.activeTab.set(tab);
    this.searchTerm.set('');
    this.companyFilter.set('all');
    this.clearMessages();
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  updateCompanyFilter(value: 'all' | string): void {
    this.companyFilter.set(value);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.companyFilter.set('all');
  }

  openCreateUnitModal(): void {
    this.clearMessages();
    this.modalMode.set('create');
    this.modalEntity.set('unit');
    this.unitForm.set({
      companyId: this.defaultCompanyId(),
      name: '',
      abbreviation: '',
    });
    this.modalOpen.set(true);
  }

  openEditUnitModal(unit: UnitItem): void {
    this.clearMessages();
    this.modalMode.set('edit');
    this.modalEntity.set('unit');
    this.unitForm.set({
      id: unit.id,
      companyId: unit.companyId,
      name: unit.name,
      abbreviation: unit.abbreviation,
    });
    this.modalOpen.set(true);
  }

  openCreateCategoryModal(): void {
    this.clearMessages();
    this.modalMode.set('create');
    this.modalEntity.set('category');
    this.categoryForm.set({
      companyId: this.defaultCompanyId(),
      name: '',
      description: '',
    });
    this.modalOpen.set(true);
  }

  openEditCategoryModal(category: ItemCategory): void {
    this.clearMessages();
    this.modalMode.set('edit');
    this.modalEntity.set('category');
    this.categoryForm.set({
      id: category.id,
      companyId: category.companyId,
      name: category.name,
      description: category.description ?? '',
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) {
      return;
    }

    this.modalOpen.set(false);
    this.clearFieldErrors();
  }

  patchUnitForm(value: Partial<UnitFormModel>): void {
    this.unitForm.update((current) => ({
      ...current,
      ...value,
    }));

    this.clearChangedFieldErrors(value);
  }

  patchCategoryForm(value: Partial<CategoryFormModel>): void {
    this.categoryForm.update((current) => ({
      ...current,
      ...value,
    }));

    this.clearChangedFieldErrors(value);
  }

  saveModal(): void {
    if (this.modalEntity() === 'unit') {
      this.saveUnit();
      return;
    }

    this.saveCategory();
  }

  saveUnit(): void {
    this.clearMessages();

    const form = this.unitForm();

    if (!this.validateUnitForm(form)) {
      return;
    }

    this.saving.set(true);

    if (this.modalMode() === 'create') {
      const payload: CreateUnitRequest = {
        companyId: form.companyId!,
        name: form.name.trim(),
        abbreviation: form.abbreviation.trim(),
      };

      this.referenceDataService
        .createUnit(payload)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (response) => {
            this.successMessage.set(response.message ?? 'Enota je bila dodana.');
            this.modalOpen.set(false);
            this.loadPage();
          },
          error: (error) => {
            console.error(error);
            this.errorMessage.set(this.extractErrorMessage(error));
          },
        });

      return;
    }

    if (!form.id) {
      this.saving.set(false);
      this.errorMessage.set('Manjka ID enote.');
      return;
    }

    const payload: UpdateUnitRequest = {
      name: form.name.trim(),
      abbreviation: form.abbreviation.trim(),
    };

    this.referenceDataService
      .updateUnit(form.id, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.successMessage.set(response.message ?? 'Enota je bila posodobljena.');
          this.modalOpen.set(false);
          this.loadPage();
        },
        error: (error) => {
          console.error(error);
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  saveCategory(): void {
    this.clearMessages();

    const form = this.categoryForm();

    if (!this.validateCategoryForm(form)) {
      return;
    }

    this.saving.set(true);

    if (this.modalMode() === 'create') {
      const payload: CreateItemCategoryRequest = {
        companyId: form.companyId!,
        name: form.name.trim(),
        description: form.description.trim() || null,
      };

      this.referenceDataService
        .createCategory(payload)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (response) => {
            this.successMessage.set(
              response.message ?? 'Kategorija je bila dodana.',
            );
            this.modalOpen.set(false);
            this.loadPage();
          },
          error: (error) => {
            console.error(error);
            this.errorMessage.set(this.extractErrorMessage(error));
          },
        });

      return;
    }

    if (!form.id) {
      this.saving.set(false);
      this.errorMessage.set('Manjka ID kategorije.');
      return;
    }

    const payload: UpdateItemCategoryRequest = {
      name: form.name.trim(),
      description: form.description.trim() || null,
    };

    this.referenceDataService
      .updateCategory(form.id, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.successMessage.set(
            response.message ?? 'Kategorija je bila posodobljena.',
          );
          this.modalOpen.set(false);
          this.loadPage();
        },
        error: (error) => {
          console.error(error);
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  deleteUnit(unit: UnitItem): void {
    this.clearMessages();

    const confirmed = window.confirm(
      `Ali res želite izbrisati enoto "${unit.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    this.referenceDataService.deleteUnit(unit.id).subscribe({
      next: (response) => {
        this.successMessage.set(response.message ?? 'Enota je bila izbrisana.');
        this.loadPage();
      },
      error: (error) => {
        console.error(error);
        this.errorMessage.set(this.extractErrorMessage(error));
      },
    });
  }

  deleteCategory(category: ItemCategory): void {
    this.clearMessages();

    const confirmed = window.confirm(
      `Ali res želite izbrisati kategorijo "${category.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    this.referenceDataService.deleteCategory(category.id).subscribe({
      next: (response) => {
        this.successMessage.set(
          response.message ?? 'Kategorija je bila izbrisana.',
        );
        this.loadPage();
      },
      error: (error) => {
        console.error(error);
        this.errorMessage.set(this.extractErrorMessage(error));
      },
    });
  }

  companyName(companyId: string | null | undefined): string {
    if (!companyId) {
      return '-';
    }

    return (
      this.effectiveCompanies().find((company) => company.id === companyId)
        ?.name ?? '-'
    );
  }

  fieldError(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  private validateUnitForm(form: UnitFormModel): boolean {
    const errors: Record<string, string> = {};

    if (!form.companyId) {
      errors['companyId'] = 'Podjetje je obvezno.';
    }

    if (!form.name.trim()) {
      errors['name'] = 'Naziv enote je obvezen.';
    }

    if (!form.abbreviation.trim()) {
      errors['abbreviation'] = 'Kratica je obvezna.';
    }

    this.fieldErrors.set(errors);

    if (Object.keys(errors).length > 0) {
      this.errorMessage.set('Preverite označena polja.');
      return false;
    }

    return true;
  }

  private validateCategoryForm(form: CategoryFormModel): boolean {
    const errors: Record<string, string> = {};

    if (!form.companyId) {
      errors['companyId'] = 'Podjetje je obvezno.';
    }

    if (!form.name.trim()) {
      errors['name'] = 'Naziv kategorije je obvezen.';
    }

    this.fieldErrors.set(errors);

    if (Object.keys(errors).length > 0) {
      this.errorMessage.set('Preverite označena polja.');
      return false;
    }

    return true;
  }

  private defaultCompanyId(): string | null {
    return this.effectiveCompanies()[0]?.id ?? null;
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.clearFieldErrors();
  }

  private clearFieldErrors(): void {
    this.fieldErrors.set({});
  }

  private clearChangedFieldErrors(value: object): void {
    const changedFields = Object.keys(value);

    if (changedFields.length === 0) {
      return;
    }

    this.fieldErrors.update((errors) => {
      const next = { ...errors };

      for (const field of changedFields) {
        delete next[field];
      }

      return next;
    });
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
}