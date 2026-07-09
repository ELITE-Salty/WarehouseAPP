import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import {
  LocationSuggestion,
  LocationValue,
} from '../../core/models/location.models';
import { LocationsService } from '../../core/services/locations.service';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './location-picker.html',
  styleUrl: './location-picker.scss',
})
export class LocationPicker implements AfterViewInit, OnDestroy {
  private readonly locationsService = inject(LocationsService);

  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  @Input() label = 'Lokacija';
  @Input() country = 'si';
  @Input() includeOnline = true;
  @Input() limit = 6;
  @Input() initialLocation: LocationValue | null = null;
  @Input() layout: 'split' | 'stacked' = 'split';
  @Input() mapShape: 'wide' | 'square' = 'wide';


  @Output() locationSelected = new EventEmitter<LocationValue>();
  @Output() locationCleared = new EventEmitter<void>();

  readonly query = signal('');
  readonly loading = signal(false);
  readonly suggestions = signal<LocationSuggestion[]>([]);
  readonly selectedLocation = signal<LocationValue | null>(null);
  readonly errorMessage = signal<string | null>(null);

  private searchTimeout: number | undefined;
  private map?: L.Map;
  private marker?: L.Marker;

  private readonly defaultIcon = L.icon({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  ngAfterViewInit(): void {
    this.initMap();

    if (this.initialLocation) {
      this.selectLocation(this.initialLocation, false);
    }

    window.setTimeout(() => {
      this.map?.invalidateSize();
    }, 300);

    window.setTimeout(() => {
      this.map?.invalidateSize();
    }, 800);
    

    this.refreshMap();

  }

  ngOnDestroy(): void {
    window.clearTimeout(this.searchTimeout);
    this.map?.remove();
  }

  refreshMap(): void {
    window.setTimeout(() => {
      this.map?.invalidateSize();
    }, 50);

    window.setTimeout(() => {
      this.map?.invalidateSize();
    }, 250);

    window.setTimeout(() => {
      this.map?.invalidateSize();
    }, 600);
  }

  get layoutClass(): string {
    return `layout-${this.layout} map-${this.mapShape}`;
  }

  search(value: string): void {
    this.query.set(value);
    this.errorMessage.set(null);

    window.clearTimeout(this.searchTimeout);

    const clean = value.trim();

    if (clean.length < 3) {
      this.suggestions.set([]);
      return;
    }

    this.searchTimeout = window.setTimeout(() => {
      this.loading.set(true);

      this.locationsService
        .suggest({
          q: clean,
          country: this.country,
          includeOnline: this.includeOnline,
          limit: this.limit,
        })
        .subscribe({
          next: (suggestions) => {
            this.suggestions.set(suggestions);
            this.loading.set(false);
          },
          error: (error) => {
            console.error(error);
            this.errorMessage.set('Lokacij ni bilo mogoče naložiti.');
            this.loading.set(false);
          },
        });
    }, 350);
  }

  chooseSuggestion(suggestion: LocationSuggestion): void {
    const location = this.suggestionToLocation(suggestion);
    this.selectLocation(location, true);
    this.query.set(location.formatted ?? this.formatLocation(location));
    this.suggestions.set([]);
  }

  clearSelection(): void {
    this.selectedLocation.set(null);
    this.query.set('');
    this.suggestions.set([]);
    this.marker?.remove();
    this.marker = undefined;
    this.locationCleared.emit();
  }

  selectLocation(location: LocationValue, emit = true): void {
    this.selectedLocation.set(location);
    this.updateMap(location);

    if (emit) {
      this.locationSelected.emit(location);
    }

    this.refreshMap();

  }

  suggestionLabel(suggestion: LocationSuggestion): string {
    return (
      suggestion.formatted ??
      [
        suggestion.name,
        suggestion.street,
        this.postCode(suggestion),
        suggestion.city,
        suggestion.country,
      ]
        .filter(Boolean)
        .join(', ')
    );
  }

  sourceLabel(source: string | undefined): string {
    if (source === 'internal') {
      return 'Baza';
    }

    if (source === 'geoapify') {
      return 'Geoapify';
    }

    return 'Lokacija';
  }

  formatLocation(location: LocationValue): string {
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

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) {
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [46.0569, 14.5058],
      zoom: 8,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    window.setTimeout(() => {
      this.map?.invalidateSize();
    }, 250);

  }

  private updateMap(location: LocationValue): void {
    if (!this.map || location.lat == null || location.lng == null) {
      return;
    }

    const latLng: L.LatLngExpression = [Number(location.lat), Number(location.lng)];

    if (!this.marker) {
      this.marker = L.marker(latLng, { icon: this.defaultIcon }).addTo(this.map);
    } else {
      this.marker.setLatLng(latLng);
    }

    this.marker.bindPopup(this.formatLocation(location));
    this.map.setView(latLng, 15);

    window.setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  private suggestionToLocation(suggestion: LocationSuggestion): LocationValue {
    return {
      id: suggestion.id,
      source: suggestion.source,
      name: suggestion.name ?? null,
      street: suggestion.street ?? '',
      postCode: this.postCode(suggestion),
      city: suggestion.city ?? '',
      country: suggestion.country ?? 'Slovenia',
      lat: suggestion.lat ?? null,
      lng: suggestion.lng ?? null,
      formatted: suggestion.formatted ?? null,
      placeId: suggestion.placeId ?? suggestion.place_id ?? null,
    };
  }

  private postCode(value: {
    postCode?: string | null;
    post_code?: string | null;
  }): string {
    return value.postCode ?? value.post_code ?? '';
  }
}