export interface ItemCompanyOption {
  id: string;
  name: string;
  companyKind?: string;
  company_kind?: string;
}

export interface ItemUnitOption {
  id: string;
  name: string;
  abbreviation?: string | null;
}

export interface ItemCategoryOption {
  id: string;
  name: string;
}

export interface ItemWarehouseLocationOption {
  id: string;
  name?: string | null;
  site?: string | null;
  area?: string | null;
  rack?: string | null;
  shelf?: string | null;
  bin?: string | null;
  barcode?: string | null;
}

export interface ItemOptions {
  companies: ItemCompanyOption[];
  units: ItemUnitOption[];
  categories: ItemCategoryOption[];
  warehouseLocations: ItemWarehouseLocationOption[];
}

export interface ExternalBarcode {
  id: string;
  itemId?: string;
  item_id?: string;
  barcodeType?: string | null;
  barcode_type?: string | null;
  value: string;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
}

export interface ItemListItem {
  id: string;
  companyId?: string;
  company_id?: string;
  company?: ItemCompanyOption | null;

  code: string;
  name: string;
  description?: string | null;

  unitId?: string;
  unit_id?: string;
  unit?: ItemUnitOption | null;

  categoryId?: string | null;
  category_id?: string | null;
  category?: ItemCategoryOption | null;

  defaultLocationId?: string | null;
  default_location_id?: string | null;
  defaultLocation?: ItemWarehouseLocationOption | null;
  default_location?: ItemWarehouseLocationOption | null;

  imagePath?: string | null;
  image_path?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;

  lowStockQuantity?: number | null;
  low_stock_quantity?: number | null;
  lowStockPalletQuantity?: number | null;
  low_stock_pallet_quantity?: number | null;

  active?: boolean;
  externalBarcodes?: ExternalBarcode[];
  external_barcodes?: ExternalBarcode[];
  barcodes?: ExternalBarcode[];
}

export interface CreateItemRequest {
  companyId: string;
  code: string;
  name: string;
  description?: string | null;
  unitId: string;
  categoryId?: string | null;
  defaultLocationId?: string | null;
  lowStockQuantity?: number | null;
  lowStockPalletQuantity?: number | null;
  active?: boolean;
}

export interface UpdateItemRequest {
  companyId?: string;
  code?: string;
  name?: string;
  description?: string | null;
  unitId?: string;
  categoryId?: string | null;
  defaultLocationId?: string | null;
  lowStockQuantity?: number | null;
  lowStockPalletQuantity?: number | null;
  active?: boolean;
}

export interface AddExternalBarcodeRequest {
  barcodeType?: string | null;
  value: string;
  active?: boolean;
}