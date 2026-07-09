import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { finalize } from 'rxjs';
import {
  CompanyContact,
  CompanyItem,
  CompanyKind,
  CreateCompanyContactRequest,
  UpdateCompanyContactRequest,
  UpdateCompanyRequest,
} from '../../core/models/company.models';
import { CompaniesService } from '../../core/services/companies.service';
import { ToastService } from '../../core/services/toast.service';
import { LocationPicker } from '../../shared/location-picker/location-picker';
import { LocationValue } from '../../core/models/location.models';
import { MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { FlatTreeControl } from '@angular/cdk/tree';
import { StorageService } from '../../core/services/storage.service';
import {
  DocumentTreeNode,
  FlatDocumentTreeNode,
  StorageFile,
  StorageFolder,
} from '../../core/models/storage.models';

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

type ContactModalMode = 'create' | 'edit';

type ContactActiveFilter = 'all' | 'active' | 'inactive';

interface ContactFormModel {
  id?: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  receivesOrderNotifications: boolean;
  receivesDocumentEmails: boolean;
  receivesLowStockAlerts: boolean;
  active: boolean;
}

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatTabsModule,
    MatTreeModule,
    MatIconModule,
    LocationPicker,
  ],
  templateUrl: './company-detail.html',
  styleUrl: './company-detail.scss',
})
export class CompanyDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly companiesService = inject(CompaniesService);
  private readonly toastService = inject(ToastService);
  private readonly storageService = inject(StorageService);

  readonly company = signal<CompanyItem | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly pendingLocation = signal<LocationValue | null>(null);

  readonly contactModalOpen = signal(false);
  readonly contactModalMode = signal<ContactModalMode>('create');
  readonly contactSaving = signal(false);
  readonly contactErrorMessage = signal<string | null>(null);
  readonly contactFieldErrors = signal<Record<string, string>>({});

  readonly contactSearchTerm = signal('');
  readonly contactActiveFilter = signal<ContactActiveFilter>('active');

  readonly documentsLoading = signal(false);
  readonly documentsErrorMessage = signal<string | null>(null);
  readonly storageFileCount = signal(0);
  readonly selectedDocument = signal<DocumentTreeNode | null>(null);
  readonly selectedDocumentUrl = signal<string | null>(null);
  readonly selectedDocumentPreviewType = signal<'image' | 'pdf' | 'other' | null>(null);

  private readonly transformer = (
  node: DocumentTreeNode,
  level: number,
  ): FlatDocumentTreeNode => {
    return {
      expandable: !node.isFile,
      name: node.name,
      level,
      isFile: node.isFile,
      path: node.path,
      key: node.key,
      prefix: node.prefix,
      size: node.size,
      lastModified: node.lastModified,
      loaded: node.loaded,
    };
  };

  readonly documentTreeControl = new FlatTreeControl<FlatDocumentTreeNode>(
    (node) => node.level,
    (node) => node.expandable,
  );

  private readonly documentTreeFlattener = new MatTreeFlattener(
    this.transformer,
    (node) => node.level,
    (node) => node.expandable,
    (node) => node.children ?? [],
  );

  readonly documentTreeDataSource = new MatTreeFlatDataSource(
    this.documentTreeControl,
    this.documentTreeFlattener,
  );

  readonly documentPrefix = computed(() => {
    return this.companyId ? `companies/${this.companyId}/` : '';
  });

  hasDocumentChild = (_: number, node: FlatDocumentTreeNode) => node.expandable;

  loadDocuments(): void {
    const prefix = this.documentPrefix();

    if (!prefix) {
      return;
    }

    this.documentsLoading.set(true);
    this.documentsErrorMessage.set(null);
    this.selectedDocument.set(null);
    this.selectedDocumentUrl.set(null);
    this.selectedDocumentPreviewType.set(null);

    this.storageService.list(prefix, 300).subscribe({
      next: (response) => {
        const tree = this.storageListToNodes(
          response.data.folders ?? [],
          response.data.files ?? [],
        );

        this.documentTreeDataSource.data = tree;
        this.storageFileCount.set(response.data.files?.length ?? 0);
        this.documentsLoading.set(false);
      },
      error: (error) => {
        console.error(error);
        this.documentsErrorMessage.set(this.extractErrorMessage(error));
        this.documentsLoading.set(false);
      },
    });
  }

  toggleDocumentFolder(node: FlatDocumentTreeNode): void {
    if (node.isFile || !node.prefix) {
      return;
    }

    if (this.documentTreeControl.isExpanded(node)) {
      this.documentTreeControl.collapse(node);
      return;
    }

    if (node.loaded) {
      this.documentTreeControl.expand(node);
      return;
    }

    this.documentsLoading.set(true);

    this.storageService.list(node.prefix, 300).subscribe({
      next: (response) => {
        this.addChildrenToTreeNode(
          node.prefix!,
          this.storageListToNodes(
            response.data.folders ?? [],
            response.data.files ?? [],
          ),
        );

        this.documentsLoading.set(false);
      },
      error: (error) => {
        console.error(error);
        this.documentsErrorMessage.set(this.extractErrorMessage(error));
        this.documentsLoading.set(false);
      },
    });
  }


  selectDocument(node: FlatDocumentTreeNode): void {
    if (!node.isFile || !node.key) {
      return;
    }

    const documentNode: DocumentTreeNode = {
      name: node.name,
      path: node.path,
      isFile: true,
      key: node.key,
      size: node.size,
      lastModified: node.lastModified,
    };

    this.selectedDocument.set(documentNode);
    this.selectedDocumentPreviewType.set(this.previewType(node.key));
    this.selectedDocumentUrl.set(this.storageService.objectUrl(node.key));
  }

  openSelectedDocument(): void {
    const document = this.selectedDocument();

    if (!document?.key) {
      return;
    }

    window.open(this.storageService.objectUrl(document.key), '_blank');
  }

  copySelectedDocumentKey(): void {
    const document = this.selectedDocument();

    if (!document?.key) {
      return;
    }

    navigator.clipboard.writeText(document.key).then(() => {
      this.toastService.success('Ključ dokumenta je kopiran.');
    });
  }

  formatFileSize(size: number | undefined): string {
    if (!size && size !== 0) {
      return '-';
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  formatDate(value: string | undefined): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('sl-SI');
  }

  fileIcon(node: FlatDocumentTreeNode): string {
    if (!node.isFile) {
      return 'folder';
    }

    const key = node.key?.toLowerCase() ?? '';

    if (key.endsWith('.pdf')) {
      return 'picture_as_pdf';
    }

    if (
      key.endsWith('.png') ||
      key.endsWith('.jpg') ||
      key.endsWith('.jpeg') ||
      key.endsWith('.webp')
    ) {
      return 'image';
    }

    return 'description';
  }

  private previewType(key: string): 'image' | 'pdf' | 'other' {
    const lowerKey = key.toLowerCase();

    if (
      lowerKey.endsWith('.png') ||
      lowerKey.endsWith('.jpg') ||
      lowerKey.endsWith('.jpeg') ||
      lowerKey.endsWith('.webp')
    ) {
      return 'image';
    }

    if (lowerKey.endsWith('.pdf')) {
      return 'pdf';
    }

    return 'other';
  }

  readonly contactForm = signal<ContactFormModel>(this.emptyContactForm());
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

  readonly filteredContacts = computed(() => {
    const company = this.company();
    const contacts = company?.contacts ?? [];
    const search = this.contactSearchTerm().trim().toLowerCase();
    const activeFilter = this.contactActiveFilter();

    return contacts.filter((contact) => {
      const active = contact.active ?? true;

      const matchesSearch =
        !search ||
        `${contact.name ?? ''} ${contact.surname ?? ''}`
          .toLowerCase()
          .includes(search) ||
        (contact.email ?? '').toLowerCase().includes(search) ||
        (contact.phone ?? '').toLowerCase().includes(search);

      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && active) ||
        (activeFilter === 'inactive' && !active);

      return matchesSearch && matchesActive;
    });
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

          this.loadDocuments();

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

openCreateContactModal(): void {
  this.contactErrorMessage.set(null);
  this.contactFieldErrors.set({});
  this.contactModalMode.set('create');
  this.contactForm.set(this.emptyContactForm());
  this.contactModalOpen.set(true);
}

openEditContactModal(contact: CompanyContact): void {
  this.contactErrorMessage.set(null);
  this.contactFieldErrors.set({});
  this.contactModalMode.set('edit');

  this.contactForm.set({
    id: contact.id,
    name: contact.name ?? '',
    surname: contact.surname ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    receivesOrderNotifications: contact.receivesOrderNotifications ?? false,
    receivesDocumentEmails: contact.receivesDocumentEmails ?? false,
    receivesLowStockAlerts: contact.receivesLowStockAlerts ?? false,
    active: contact.active ?? true,
  });

  this.contactModalOpen.set(true);
}

closeContactModal(): void {
  if (this.contactSaving()) {
    return;
  }

  this.contactModalOpen.set(false);
  this.contactErrorMessage.set(null);
  this.contactFieldErrors.set({});
}

patchContactForm(value: Partial<ContactFormModel>): void {
  this.contactForm.update((current) => ({
    ...current,
    ...value,
  }));

  this.contactFieldErrors.update((errors) => {
    const next = { ...errors };

    for (const field of Object.keys(value)) {
      delete next[field];
    }

    return next;
  });
}

saveContact(): void {
  this.contactErrorMessage.set(null);
  this.contactFieldErrors.set({});

  const form = this.contactForm();

  if (!this.validateContactForm(form)) {
    return;
  }

  this.contactSaving.set(true);

  if (this.contactModalMode() === 'create') {
    const payload: CreateCompanyContactRequest = {
      name: form.name.trim(),
      surname: form.surname.trim(),
      email: this.optionalString(form.email),
      phone: this.normalizedPhoneOrNull(form.phone),
      receivesOrderNotifications: form.receivesOrderNotifications,
      receivesDocumentEmails: form.receivesDocumentEmails,
      receivesLowStockAlerts: form.receivesLowStockAlerts,
      active: form.active,
    };

    this.companiesService
      .createContact(this.companyId, payload)
      .pipe(finalize(() => this.contactSaving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Kontakt je bil dodan.');
          this.contactModalOpen.set(false);
          this.loadCompany();
        },
        error: (error) => {
          const message = this.extractErrorMessage(error);
          this.contactErrorMessage.set(message);
          this.toastService.error(message);
        },
      });

    return;
  }

  if (!form.id) {
    this.contactSaving.set(false);
    this.contactErrorMessage.set('Manjka ID kontakta.');
    return;
  }

  const payload: UpdateCompanyContactRequest = {
    name: form.name.trim(),
    surname: form.surname.trim(),
    email: this.optionalString(form.email),
    phone: this.normalizedPhoneOrNull(form.phone),
    receivesOrderNotifications: form.receivesOrderNotifications,
    receivesDocumentEmails: form.receivesDocumentEmails,
    receivesLowStockAlerts: form.receivesLowStockAlerts,
    active: form.active,
  };

  this.companiesService
    .updateContact(this.companyId, form.id, payload)
    .pipe(finalize(() => this.contactSaving.set(false)))
    .subscribe({
      next: () => {
        this.toastService.success('Kontakt je bil posodobljen.');
        this.contactModalOpen.set(false);
        this.loadCompany();
      },
      error: (error) => {
        const message = this.extractErrorMessage(error);
        this.contactErrorMessage.set(message);
        this.toastService.error(message);
      },
    });
}

toggleContactActive(contact: CompanyContact): void {
  this.companiesService
    .updateContact(this.companyId, contact.id, {
      active: !(contact.active ?? true),
    })
    .subscribe({
      next: () => {
        this.toastService.success(
          contact.active ? 'Kontakt je deaktiviran.' : 'Kontakt je aktiviran.',
        );
        this.loadCompany();
      },
      error: (error) => {
        this.toastService.error(this.extractErrorMessage(error));
      },
    });
}

contactFieldError(field: string): string | null {
  return this.contactFieldErrors()[field] ?? null;
}

contactModalTitle(): string {
  return this.contactModalMode() === 'create' ? 'Dodaj kontakt' : 'Uredi kontakt';
}


private validateContactForm(form: ContactFormModel): boolean {
  const errors: Record<string, string> = {};

  if (!form.name.trim()) {
    errors['name'] = 'Ime je obvezno.';
  }

  if (!form.surname.trim()) {
    errors['surname'] = 'Priimek je obvezen.';
  }

  const email = form.email.trim();
  const phone = form.phone.trim();

  if (!email && !phone) {
    errors['email'] = 'Vnesite e-pošto ali telefon.';
    errors['phone'] = 'Vnesite e-pošto ali telefon.';
  }

  if (email && !this.isValidEmail(email)) {
    errors['email'] = 'E-pošta ni pravilna.';
  }

  if (phone && !this.isValidPhone(phone)) {
    errors['phone'] = 'Telefon ni pravilen. Primer: +386 41 222 333';
  }

  this.contactFieldErrors.set(errors);

  if (Object.keys(errors).length > 0) {
    this.contactErrorMessage.set('Preverite označena polja.');
    return false;
  }

  return true;
}

private isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

private isValidPhone(value: string): boolean {
  return /^\+?[0-9\s()./-]{6,24}$/.test(value.trim());
}

private normalizedPhoneOrNull(value: string): string | null {
  const clean = value.trim().replace(/\s+/g, ' ');
  return clean ? clean : null;
}

private emptyContactForm(): ContactFormModel {
  return {
    name: '',
    surname: '',
    email: '',
    phone: '',
    receivesOrderNotifications: true,
    receivesDocumentEmails: true,
    receivesLowStockAlerts: false,
    active: true,
  };
}

updateContactSearch(value: string): void {
  this.contactSearchTerm.set(value);
}

updateContactActiveFilter(value: ContactActiveFilter): void {
  this.contactActiveFilter.set(value);
}

clearContactFilters(): void {
  this.contactSearchTerm.set('');
  this.contactActiveFilter.set('active');
}

private storageListToNodes(
  folders: StorageFolder[],
  files: StorageFile[],
): DocumentTreeNode[] {
  const folderNodes: DocumentTreeNode[] = folders.map((folder) => ({
    name: folder.name,
    path: folder.prefix,
    prefix: folder.prefix,
    isFile: false,
    children: [],
    loaded: false,
  }));

  const fileNodes: DocumentTreeNode[] = files.map((file) => ({
    name: file.name ?? this.fileNameFromKey(file.key),
    path: file.key,
    key: file.key,
    isFile: true,
    size: file.size,
    lastModified: file.lastModified ?? file.last_modified,
  }));

  return [...folderNodes, ...fileNodes].sort((a, b) => {
    if (a.isFile !== b.isFile) {
      return a.isFile ? 1 : -1;
    }

    return a.name.localeCompare(b.name);
  });
}

private addChildrenToTreeNode(
  prefix: string,
  children: DocumentTreeNode[],
): void {
  const data = this.documentTreeDataSource.data;
  const target = this.findDocumentNodeByPrefix(data, prefix);

  if (!target) {
    return;
  }

  target.children = children;
  target.loaded = true;

  this.documentTreeDataSource.data = [...data];

  const flatNode = this.documentTreeControl.dataNodes.find(
    (item) => item.prefix === prefix,
  );

  if (flatNode) {
    this.documentTreeControl.expand(flatNode);
  }
}

private findDocumentNodeByPrefix(
  nodes: DocumentTreeNode[],
  prefix: string,
): DocumentTreeNode | null {
  for (const node of nodes) {
    if (node.prefix === prefix) {
      return node;
    }

    if (node.children?.length) {
      const found = this.findDocumentNodeByPrefix(node.children, prefix);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

private fileNameFromKey(key: string): string {
  return key.split('/').filter(Boolean).at(-1) ?? key;
}

}