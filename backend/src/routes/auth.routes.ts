import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { signup, login, getMe, logout } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { signupSchema, loginSchema } from '../validators/auth.validator';

const authRouter = Router();

// Rate limiter for authentication endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 50, // Higher limit for tests
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
    errors: [],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post('/signup', authLimiter, validateRequest(signupSchema), signup);
authRouter.post('/login', authLimiter, validateRequest(loginSchema), login);
authRouter.get('/me', authenticateToken, getMe);
authRouter.post('/logout', logout);

export default authRouter;
export { authRouter };
