import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ItemsService } from '../../core/services/items.service';
import { ToastService } from '../../core/services/toast.service';
import {
  CreateItemRequest,
  ItemListItem,
  ItemOptions,
} from '../../core/models/item.models';

type ActiveFilter = 'active' | 'inactive' | 'all';

interface ItemFormModel {
  id?: string;
  companyId: string;
  code: string;
  name: string;
  description: string;
  unitId: string;
  categoryId: string;
  defaultLocationId: string;
  lowStockQuantity: string;
  lowStockPalletQuantity: string;
  active: boolean;
}

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './items.html',
  styleUrl: './items.scss',
})
export class Items {
  private readonly itemsService = inject(ItemsService);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly items = signal<ItemListItem[]>([]);
  readonly options = signal<ItemOptions>({
    companies: [],
    units: [],
    categories: [],
    warehouseLocations: [],
  });

  readonly searchTerm = signal('');
  readonly companyFilter = signal('');
  readonly categoryFilter = signal('');
  readonly activeFilter = signal<ActiveFilter>('active');

  readonly modalOpen = signal(false);
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly formErrorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly form = signal<ItemFormModel>(this.emptyForm());

  readonly filteredItems = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const companyId = this.companyFilter();
    const categoryId = this.categoryFilter();
    const activeFilter = this.activeFilter();

    return this.items().filter((item) => {
      const active = item.active ?? true;
      const itemCompanyId = this.itemCompanyId(item);
      const itemCategoryId = this.itemCategoryId(item);

      const matchesSearch =
        !search ||
        item.code.toLowerCase().includes(search) ||
        item.name.toLowerCase().includes(search) ||
        (item.description ?? '').toLowerCase().includes(search);

      const matchesCompany = !companyId || itemCompanyId === companyId;
      const matchesCategory = !categoryId || itemCategoryId === categoryId;

      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && active) ||
        (activeFilter === 'inactive' && !active);

      return matchesSearch && matchesCompany && matchesCategory && matchesActive;
    });
  });

  constructor() {
    this.loadOptions();
    this.loadItems();
  }

  loadOptions(companyId?: string): void {
    this.itemsService.getOptions(companyId).subscribe({
      next: (response) => {
        const data = 'data' in response ? response.data : response;
        this.options.set({
          companies: data.companies ?? [],
          units: data.units ?? [],
          categories: data.categories ?? [],
          warehouseLocations: data.warehouseLocations ?? [],
        });
      },
      error: (error) => {
        console.error(error);
        this.toastService.error(this.extractErrorMessage(error));
      },
    });
  }

  loadItems(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.itemsService
      .getItems({
        q: this.searchTerm().trim() || undefined,
        companyId: this.companyFilter() || undefined,
        categoryId: this.categoryFilter() || undefined,
        active:
          this.activeFilter() === 'all'
            ? null
            : this.activeFilter() === 'active',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.items.set(response.data ?? []);
        },
        error: (error) => {
          const message = this.extractErrorMessage(error);
          this.errorMessage.set(message);
          this.toastService.error(message);
        },
      });
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  updateCompanyFilter(value: string): void {
    this.companyFilter.set(value);
    this.loadOptions(value || undefined);
  }

  updateCategoryFilter(value: string): void {
    this.categoryFilter.set(value);
  }

  updateActiveFilter(value: ActiveFilter): void {
    this.activeFilter.set(value);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.companyFilter.set('');
    this.categoryFilter.set('');
    this.activeFilter.set('active');
    this.loadOptions();
    this.loadItems();
  }

  openCreateModal(): void {
    this.modalMode.set('create');
    this.form.set(this.emptyForm());
    this.formErrorMessage.set(null);
    this.fieldErrors.set({});
    this.modalOpen.set(true);
  }

  openEditModal(item: ItemListItem): void {
    this.modalMode.set('edit');
    this.formErrorMessage.set(null);
    this.fieldErrors.set({});

    this.form.set({
      id: item.id,
      companyId: this.itemCompanyId(item),
      code: item.code ?? '',
      name: item.name ?? '',
      description: item.description ?? '',
      unitId: this.itemUnitId(item),
      categoryId: this.itemCategoryId(item) ?? '',
      defaultLocationId: this.itemDefaultLocationId(item) ?? '',
      lowStockQuantity: this.itemLowStockQuantity(item)?.toString() ?? '',
      lowStockPalletQuantity:
        this.itemLowStockPalletQuantity(item)?.toString() ?? '',
      active: item.active ?? true,
    });

    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) return;

    this.modalOpen.set(false);
    this.formErrorMessage.set(null);
    this.fieldErrors.set({});
  }

  patchForm(value: Partial<ItemFormModel>): void {
    this.form.update((current) => ({ ...current, ...value }));

    this.fieldErrors.update((errors) => {
      const next = { ...errors };

      for (const field of Object.keys(value)) {
        delete next[field];
      }

      return next;
    });

    if (value.companyId !== undefined) {
      this.loadOptions(value.companyId || undefined);
    }
  }

  saveItem(): void {
    const form = this.form();

    this.formErrorMessage.set(null);
    this.fieldErrors.set({});

    if (!this.validateForm(form)) return;

    this.saving.set(true);

    const payload: CreateItemRequest = {
      companyId: form.companyId,
      code: form.code.trim(),
      name: form.name.trim(),
      description: this.optionalString(form.description),
      unitId: form.unitId,
      categoryId: this.optionalString(form.categoryId),
      defaultLocationId: this.optionalString(form.defaultLocationId),
      lowStockQuantity: this.optionalNumber(form.lowStockQuantity),
      lowStockPalletQuantity: this.optionalNumber(form.lowStockPalletQuantity),
      active: form.active,
    };

    const request =
      this.modalMode() === 'create'
        ? this.itemsService.createItem(payload)
        : this.itemsService.updateItem(form.id!, payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toastService.success(
          this.modalMode() === 'create'
            ? 'Artikel je bil ustvarjen.'
            : 'Artikel je bil posodobljen.',
        );
        this.modalOpen.set(false);
        this.loadItems();
      },
      error: (error) => {
        const message = this.extractErrorMessage(error);
        this.formErrorMessage.set(message);
        this.toastService.error(message);
      },
    });
  }

  toggleItemActive(item: ItemListItem): void {
    const active = !(item.active ?? true);

    this.itemsService.setItemActive(item.id, active).subscribe({
      next: () => {
        this.toastService.success(
          active ? 'Artikel je aktiviran.' : 'Artikel je deaktiviran.',
        );
        this.loadItems();
      },
      error: (error) => {
        this.toastService.error(this.extractErrorMessage(error));
      },
    });
  }

  modalTitle(): string {
    return this.modalMode() === 'create' ? 'Dodaj artikel' : 'Uredi artikel';
  }

  fieldError(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  companyName(item: ItemListItem): string {
    return item.company?.name ?? '-';
  }

  unitLabel(item: ItemListItem): string {
    const unit = item.unit;

    if (!unit) return '-';

    return unit.abbreviation ? `${unit.name} (${unit.abbreviation})` : unit.name;
  }

  categoryName(item: ItemListItem): string {
    return item.category?.name ?? '-';
  }

  locationLabel(locationId: string | null | undefined): string {
    if (!locationId) return '';

    const location = this.options().warehouseLocations.find(
      (item) => item.id === locationId,
    );

    if (!location) return locationId;

    return [
      location.name,
      location.site,
      location.area,
      location.rack,
      location.shelf,
      location.bin,
    ]
      .filter(Boolean)
      .join(' / ');
  }

  itemCompanyId(item: ItemListItem): string {
    return item.companyId ?? item.company_id ?? item.company?.id ?? '';
  }

  itemUnitId(item: ItemListItem): string {
    return item.unitId ?? item.unit_id ?? item.unit?.id ?? '';
  }

  itemCategoryId(item: ItemListItem): string | null {
    return item.categoryId ?? item.category_id ?? item.category?.id ?? null;
  }

  itemDefaultLocationId(item: ItemListItem): string | null {
    return (
      item.defaultLocationId ??
      item.default_location_id ??
      item.defaultLocation?.id ??
      item.default_location?.id ??
      null
    );
  }

  itemLowStockQuantity(item: ItemListItem): number | null {
    return item.lowStockQuantity ?? item.low_stock_quantity ?? null;
  }

  itemLowStockPalletQuantity(item: ItemListItem): number | null {
    return item.lowStockPalletQuantity ?? item.low_stock_pallet_quantity ?? null;
  }

  private validateForm(form: ItemFormModel): boolean {
    const errors: Record<string, string> = {};

    if (!form.companyId) errors['companyId'] = 'Podjetje je obvezno.';
    if (!form.code.trim()) errors['code'] = 'Šifra je obvezna.';
    if (!form.name.trim()) errors['name'] = 'Naziv je obvezen.';
    if (!form.unitId) errors['unitId'] = 'Enota je obvezna.';

    const lowStockQuantity = String(form.lowStockQuantity ?? '').trim();
    const lowStockPalletQuantity = String(form.lowStockPalletQuantity ?? '').trim();

    if (lowStockQuantity && Number.isNaN(Number(lowStockQuantity))) {
      errors['lowStockQuantity'] = 'Vnesite številko.';
    }

    if (lowStockPalletQuantity && Number.isNaN(Number(lowStockPalletQuantity))) {
      errors['lowStockPalletQuantity'] = 'Vnesite številko.';
    }

    this.fieldErrors.set(errors);

    if (Object.keys(errors).length > 0) {
      this.formErrorMessage.set('Preverite označena polja.');
      return false;
    }

    return true;
  }

  private emptyForm(): ItemFormModel {
    return {
      companyId: '',
      code: '',
      name: '',
      description: '',
      unitId: '',
      categoryId: '',
      defaultLocationId: '',
      lowStockQuantity: '',
      lowStockPalletQuantity: '',
      active: true,
    };
  }

  private optionalString(value: string): string | null {
    const clean = value.trim();
    return clean ? clean : null;
  }

  private optionalNumber(value: string | number | null | undefined): number | null {
    const clean = String(value ?? '').trim();
    return clean ? Number(clean) : null;
  }

  private extractErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error?: { message?: unknown } }).error?.message ===
        'string'
    ) {
      return (error as { error: { message: string } }).error.message;
    }

    return 'Prišlo je do napake.';
  }
}