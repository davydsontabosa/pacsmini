export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface ApiResponse<T> {
  data: T
  ok: boolean
}
