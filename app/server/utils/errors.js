/**
 * Structured Error Classes for WantokJobs
 * 
 * Usage:
 *   const { NotFoundError, ValidationError } = require('../utils/errors');
 *   throw new NotFoundError('Job not found');
 *   throw new ValidationError('Title is required');
 */

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class PaymentRequiredError extends AppError {
  constructor(message = 'Payment required') {
    super(message, 402, 'PAYMENT_REQUIRED');
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  RateLimitError,
  UnauthorizedError,
  PaymentRequiredError,
  ServiceUnavailableError,
};
