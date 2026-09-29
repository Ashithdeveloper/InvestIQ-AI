import { Response } from 'express';

export interface ApiResponseOptions<T = unknown> {
  res: Response;
  statusCode: number;
  message: string;
  data?: T;
  errors?: unknown[];
}

const sendSuccess = <T>(res: Response, statusCode: number, message: string, data?: T) => {
  const payload: { success: true; message: string; data?: T } = {
    success: true,
    message,
  };

  if (data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};

const sendError = (res: Response, statusCode: number, message: string, errors: unknown[] = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

export { sendSuccess, sendError };
