export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    details?: any,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this);
  }
}

// Not Found Error
export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: any) {
    super(message, 404);
  }
}

// Validation Error
export class ValidationError extends AppError {
  constructor(message = "Invalid Request Data", details?: any) {
    super(message, 400, true, details);
  }
}

// Authentication Error
export class AuthenticationError extends AppError {
  constructor(message = "unauthenticated") {
    super(message, 401);
  }
}

// Forbidden Error
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

// Database Error
export class DatabaseError extends AppError {
  constructor(message = "Something went wrong", details?: any) {
    super(message, 500, true, details);
  }
}
