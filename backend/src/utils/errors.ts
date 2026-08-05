/** Thrown when caller-supplied input fails validation. Maps to HTTP 400. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Thrown when a referenced resource does not exist. Maps to HTTP 404. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Maps a caught error to the HTTP status code a route should respond with. */
export function statusCodeFor(err: unknown): number {
  if (err instanceof ValidationError) return 400;
  if (err instanceof NotFoundError) return 404;
  return 500;
}
