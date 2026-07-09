export type LocationSuggestionSource = 'internal' | 'geoapify';

export interface LocationSuggestion {
  source: LocationSuggestionSource;
  id?: string;
  name?: string | null;
  street?: string | null;
  postCode?: string | null;
  post_code?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  formatted?: string | null;
  placeId?: string | null;
  place_id?: string | null;
}

export interface LocationPayload {
  name?: string | null;
  street: string;
  postCode: string;
  city: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
  formatted?: string | null;
  placeId?: string | null;
}

export interface LocationValue {
  id?: string;
  source?: LocationSuggestionSource;
  name?: string | null;
  street: string;
  postCode: string;
  city: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
  formatted?: string | null;
  placeId?: string | null;
}