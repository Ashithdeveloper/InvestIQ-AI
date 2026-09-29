import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, getCurrentUser } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await registerUser(req.body);
    sendSuccess(res, 201, 'User registered successfully', result);
  } catch (error) {
    next(error);
  }
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await loginUser(req.body);
    sendSuccess(res, 200, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendError(res, 401, 'Authentication required');
      return;
    }
    const user = await getCurrentUser(req.user.userId);
    sendSuccess(res, 200, 'User profile retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

const logout = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(
    res,
    200,
    'Logged out successfully. Please remove the access token from client storage.'
  );
};

export { signup, login, getMe, logout };
