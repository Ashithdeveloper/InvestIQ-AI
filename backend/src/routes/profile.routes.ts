import { Router } from 'express';
import {
  createOrCompleteProfile,
  getProfile,
  updateProfile,
} from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createFinancialProfileSchema,
  updateFinancialProfileSchema,
} from '../validators/profile.validator';

const profileRouter = Router();

// All profile endpoints require valid authentication
profileRouter.use(authenticateToken);

profileRouter.post(
  '/financial',
  validateRequest(createFinancialProfileSchema),
  createOrCompleteProfile
);

profileRouter.get('/financial', getProfile);

profileRouter.put(
  '/financial',
  validateRequest(updateFinancialProfileSchema),
  updateProfile
);

export default profileRouter;
export { profileRouter };
