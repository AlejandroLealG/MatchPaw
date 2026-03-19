export interface PaginationDto {
  page?: number;
  limit?: number;
}
export interface PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
//# sourceMappingURL=pagination.dto.d.ts.map
