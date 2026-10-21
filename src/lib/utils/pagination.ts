export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  page: number;
  size: number;
}

/**
 * Builds URLSearchParams for pagination query strings.
 */
export function buildPaginationParams(page: number, size: number): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  return params;
}
