export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Status 0 means the request never got an answer (offline, DNS, CORS, server down). */
export function networkError(): ApiError {
  return new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
}
