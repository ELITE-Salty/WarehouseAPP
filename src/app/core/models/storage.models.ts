export interface StorageFolder {
  prefix: string;
  name: string;
}

export interface StorageFile {
  key: string;
  name?: string;
  size?: number;
  lastModified?: string;
  last_modified?: string;
  contentType?: string;
  content_type?: string;
}

export interface StorageListData {
  prefix: string;
  folders: StorageFolder[];
  files: StorageFile[];
}

export interface StorageListResponse {
  data: StorageListData;
}

export interface StorageSignedUrlResponse {
  url: string;
  expiresInSeconds: number;
}

export interface DocumentTreeNode {
  name: string;
  path: string;
  isFile: boolean;
  key?: string;
  prefix?: string;
  size?: number;
  lastModified?: string;
  children?: DocumentTreeNode[];
  loaded?: boolean;
}

export interface FlatDocumentTreeNode {
  expandable: boolean;
  name: string;
  level: number;
  isFile: boolean;
  path: string;
  key?: string;
  prefix?: string;
  size?: number;
  lastModified?: string;
  loaded?: boolean;
}