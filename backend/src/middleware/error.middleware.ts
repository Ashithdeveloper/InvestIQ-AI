import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

export interface AppError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
}

const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    sendError(res, 409, `An account with this ${field} already exists`, [
      { field, message: `${field} is already in use` },
    ]);
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const formattedErrors = Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors ? err.errors[key]?.message : 'Invalid value',
    }));
    sendError(res, 400, 'Database validation failed', formattedErrors);
    return;
  }

  // Mongoose invalid ObjectId / CastError
  if (err.name === 'CastError') {
    sendError(res, 400, 'Invalid resource identifier format');
    return;
  }

  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  if (statusCode === 500) {
    console.error('[Unhandled Error]:', err);
  }

  sendError(res, statusCode, message);
};

export { errorHandler };
