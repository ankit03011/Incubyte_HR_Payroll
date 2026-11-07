/** Domain errors. The HTTP layer maps each to a status code; nothing below it knows about HTTP. */

export class ValidationError extends Error {
  constructor(readonly fields: Record<string, string[]>) {
    super('Request validation failed');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: number) {
    super(`${resource} ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`Email ${email} is already used by another employee`);
    this.name = 'DuplicateEmailError';
  }
}
