export interface ApiDataResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
}

export interface ApiSuccessResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}