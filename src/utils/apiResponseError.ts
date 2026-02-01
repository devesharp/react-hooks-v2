export class ApiError extends Error {
  public response: unknown;

  constructor(response: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
    this.response = response;
  }
}