import { Request, Response, NextFunction } from 'express';
import {
  saveFinancialProfile,
  getFinancialProfile,
  updateFinancialProfile,
} from '../services/profile.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

const createOrCompleteProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendError(res, 401, 'Authentication required');
      return;
    }

    const result = await saveFinancialProfile(req.user.userId, req.body);
    sendSuccess(res, 200, 'Financial profile saved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendError(res, 401, 'Authentication required');
      return;
    }

    const result = await getFinancialProfile(req.user.userId);
    sendSuccess(res, 200, 'Financial profile retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendError(res, 401, 'Authentication required');
      return;
    }

    const result = await updateFinancialProfile(req.user.userId, req.body);
    sendSuccess(res, 200, 'Financial profile updated successfully', result);
  } catch (error) {
    next(error);
  }
};

export { createOrCompleteProfile, getProfile, updateProfile };
