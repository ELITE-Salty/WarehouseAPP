import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ItemsService } from '../../core/services/items.service';
import { ToastService } from '../../core/services/toast.service';
import { StorageService } from '../../core/services/storage.service';
import { ExternalBarcode, ItemListItem } from '../../core/models/item.models';

import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, Result } from '@zxing/library';

type PreviewType = 'image' | 'none';

@Component({
  selector: 'app-item-detail',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './item-detail.html',
  styleUrl: './item-detail.scss',
})
export class ItemDetail implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly itemsService = inject(ItemsService);
  private readonly toastService = inject(ToastService);
  private readonly storageService = inject(StorageService);

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('photoVideoElement') photoVideoElement?: ElementRef<HTMLVideoElement>;

  readonly itemId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly imageUploading = signal(false);

  readonly item = signal<ItemListItem | null>(null);
  readonly imageObjectUrl = signal<string | null>(null);

  readonly barcodeValue = signal('');
  readonly barcodeType = signal('EAN');
  readonly barcodeError = signal<string | null>(null);

  readonly scannerOpen = signal(false);
  readonly scannerMessage = signal<string | null>(null);
  readonly scanning = signal(false);

  readonly photoCameraOpen = signal(false);
  readonly photoCameraMessage = signal<string | null>(null);

  private currentObjectUrl: string | null = null;

  private scannerControls?: IScannerControls;
  private codeReader?: BrowserMultiFormatReader;

  private photoStream?: MediaStream;

  constructor() {
    this.loadItem();
  }

  ngOnDestroy(): void {
    this.stopScanner();
    this.stopPhotoCamera();
    this.revokeImageObjectUrl();
  }

  loadItem(): void {
    if (!this.itemId) return;

    this.loading.set(true);

    this.itemsService
      .getItem(this.itemId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.item.set(response.data);
          this.loadItemImage(response.data);
        },
        error: (error) => {
          this.toastService.error(this.extractErrorMessage(error));
        },
      });
  }

  private loadItemImage(item: ItemListItem): void {
    this.revokeImageObjectUrl();

    const imagePath = item.imagePath ?? item.image_path;

    if (!imagePath) {
      this.imageObjectUrl.set(null);
      return;
    }

    this.storageService.getObjectAsObjectUrl(imagePath).subscribe({
      next: (objectUrl) => {
        this.currentObjectUrl = objectUrl;
        this.imageObjectUrl.set(objectUrl);
      },
      error: (error) => {
        console.error(error);
        this.imageObjectUrl.set(null);
        this.toastService.error('Slike artikla ni bilo mogoče naložiti.');
      },
    });
  }

  private revokeImageObjectUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    this.imageObjectUrl.set(null);
  }

  uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.uploadImageFile(file, () => {
      input.value = '';
    });
  }

  private uploadImageFile(file: File, afterUpload?: () => void): void {
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Izberite slikovno datoteko.');
      afterUpload?.();
      return;
    }

    this.imageUploading.set(true);

    this.itemsService
      .uploadImage(this.itemId, file)
      .pipe(finalize(() => this.imageUploading.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Slika artikla je posodobljena.');
          afterUpload?.();
          this.closePhotoCamera();
          this.loadItem();
        },
        error: (error) => {
          this.toastService.error(this.extractErrorMessage(error));
          afterUpload?.();
        },
      });
  }

  async openPhotoCamera(): Promise<void> {
    this.photoCameraOpen.set(true);
    this.photoCameraMessage.set(null);

    try {
      this.stopScanner();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: 'environment',
          },
        },
        audio: false,
      });

      this.photoStream = stream;

      window.setTimeout(() => {
        const video = this.photoVideoElement?.nativeElement;

        if (!video) {
          this.photoCameraMessage.set('Kamera ni pripravljena.');
          return;
        }

        video.srcObject = stream;
        void video.play();
      }, 100);
    } catch (error) {
      console.error(error);
      this.photoCameraMessage.set('Kamere ni bilo mogoče zagnati.');
    }
  }

  captureArticlePhoto(): void {
    const video = this.photoVideoElement?.nativeElement;

    if (!video) {
      this.photoCameraMessage.set('Kamera ni pripravljena.');
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      this.photoCameraMessage.set('Slika še ni pripravljena. Poskusite znova.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      this.photoCameraMessage.set('Slike ni bilo mogoče zajeti.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.photoCameraMessage.set('Slike ni bilo mogoče ustvariti.');
          return;
        }

        const file = new File(
          [blob],
          `artikel-${this.itemId}-${Date.now()}.jpg`,
          {
            type: 'image/jpeg',
          },
        );

        this.uploadImageFile(file);
      },
      'image/jpeg',
      0.9,
    );
  }

  closePhotoCamera(): void {
    this.photoCameraOpen.set(false);
    this.stopPhotoCamera();
  }

  private stopPhotoCamera(): void {
    this.photoStream?.getTracks().forEach((track) => track.stop());
    this.photoStream = undefined;

    const video = this.photoVideoElement?.nativeElement;

    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }

  onImageLoadError(): void {
    this.revokeImageObjectUrl();
    this.toastService.error('Slike artikla ni bilo mogoče prikazati.');
  }

  addBarcode(): void {
    this.barcodeError.set(null);

    const value = this.barcodeValue().trim();

    if (!value) {
      this.barcodeError.set('Vnesite ali skenirajte črtno kodo.');
      return;
    }

    if (!/^[\w\s\-./:+#]{2,160}$/.test(value)) {
      this.barcodeError.set('Črtna koda vsebuje nedovoljene znake.');
      return;
    }

    this.saving.set(true);

    this.itemsService
      .addBarcode(this.itemId, {
        barcodeType: this.barcodeType().trim() || null,
        value,
        active: true,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Črtna koda je dodana.');
          this.barcodeValue.set('');
          this.loadItem();
        },
        error: (error) => {
          this.toastService.error(this.extractErrorMessage(error));
        },
      });
  }

  toggleBarcode(barcode: ExternalBarcode): void {
    this.itemsService
      .setBarcodeActive(this.itemId, barcode.id, !(barcode.active ?? true))
      .subscribe({
        next: () => {
          this.toastService.success('Status črtne kode je posodobljen.');
          this.loadItem();
        },
        error: (error) => {
          this.toastService.error(this.extractErrorMessage(error));
        },
      });
  }

  deleteBarcode(barcode: ExternalBarcode): void {
    const confirmed = window.confirm(`Izbrišem črtno kodo ${barcode.value}?`);

    if (!confirmed) return;

    this.itemsService.deleteBarcode(this.itemId, barcode.id).subscribe({
      next: () => {
        this.toastService.success('Črtna koda je izbrisana.');
        this.loadItem();
      },
      error: (error) => {
        this.toastService.error(this.extractErrorMessage(error));
      },
    });
  }

  async openScanner(): Promise<void> {
    this.scannerOpen.set(true);
    this.scannerMessage.set(null);

    try {
      this.stopPhotoCamera();

      const hints = new Map();

      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.ITF,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.PDF_417,
        BarcodeFormat.AZTEC,
      ]);

      this.codeReader = new BrowserMultiFormatReader(hints);

      window.setTimeout(async () => {
        const video = this.videoElement?.nativeElement;

        if (!video || !this.codeReader) {
          this.scannerMessage.set('Kamera ni pripravljena.');
          return;
        }

        this.scanning.set(true);

        this.scannerControls = await this.codeReader.decodeFromVideoDevice(
          undefined,
          video,
          (result: Result | undefined) => {
            if (!result) return;

            const text = result.getText();

            if (!text) return;

            this.barcodeValue.set(text);

            const format = result.getBarcodeFormat();

            if (format !== undefined) {
              this.barcodeType.set(this.zxingFormatLabel(format));
            }

            this.toastService.success('Črtna koda je prebrana.');
            this.closeScanner();
          },
        );
      }, 100);
    } catch (error) {
      console.error(error);
      this.scannerMessage.set('Kamere ni bilo mogoče zagnati.');
      this.scanning.set(false);
    }
  }

  closeScanner(): void {
    this.scannerOpen.set(false);
    this.stopScanner();
  }

  private stopScanner(): void {
    this.scanning.set(false);

    this.scannerControls?.stop();
    this.scannerControls = undefined;

    this.codeReader = undefined;
  }

  private zxingFormatLabel(format: BarcodeFormat): string {
    switch (format) {
      case BarcodeFormat.EAN_13:
      case BarcodeFormat.EAN_8:
        return 'EAN';

      case BarcodeFormat.QR_CODE:
        return 'QR';

      case BarcodeFormat.CODE_128:
      case BarcodeFormat.CODE_39:
      case BarcodeFormat.CODE_93:
        return 'CODE';

      case BarcodeFormat.UPC_A:
      case BarcodeFormat.UPC_E:
        return 'UPC';

      case BarcodeFormat.DATA_MATRIX:
        return 'DATA_MATRIX';

      case BarcodeFormat.PDF_417:
        return 'PDF_417';

      case BarcodeFormat.AZTEC:
        return 'AZTEC';

      default:
        return 'OTHER';
    }
  }

  imageUrl(): string | null {
    return this.imageObjectUrl();
  }

  previewType(): PreviewType {
    return this.imageUrl() ? 'image' : 'none';
  }

  barcodes(): ExternalBarcode[] {
    const item = this.item();

    return item?.barcodes ?? item?.externalBarcodes ?? item?.external_barcodes ?? [];
  }

  barcodeTypeLabel(barcode: ExternalBarcode): string {
    return barcode.barcodeType ?? barcode.barcode_type ?? 'BARCODE';
  }

  lowStockQuantity(): number | null {
    const item = this.item();

    return item?.lowStockQuantity ?? item?.low_stock_quantity ?? null;
  }

  lowStockPalletQuantity(): number | null {
    const item = this.item();

    return item?.lowStockPalletQuantity ?? item?.low_stock_pallet_quantity ?? null;
  }

  companyName(): string {
    return this.item()?.company?.name ?? '-';
  }

  unitLabel(): string {
    const unit = this.item()?.unit;

    if (!unit) return '-';

    return unit.abbreviation ? `${unit.name} (${unit.abbreviation})` : unit.name;
  }

  categoryName(): string {
    return this.item()?.category?.name ?? '-';
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