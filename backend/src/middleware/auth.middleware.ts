import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/apiResponse';

const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, 'Authorization token is missing or malformed');
    return;
  }

  const token = authHeader.split(' ')[1]?.trim();

  if (!token) {
    sendError(res, 401, 'Authorization token is missing');
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      sendError(res, 401, 'Token has expired');
      return;
    }
    if (error instanceof JsonWebTokenError) {
      sendError(res, 401, 'Invalid authentication token');
      return;
    }
    sendError(res, 401, 'Authentication failed');
  }
};

const optionalAuthenticateToken = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
  } catch {
    // Ignore invalid/expired tokens for optional authentication
  }

  next();
};

export { authenticateToken, optionalAuthenticateToken };
