import jwt, { SignOptions } from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is missing in production');
    }
    return 'fallback_default_jwt_secret_dev_only';
  }
  return secret;
};

const generateToken = (payload: TokenPayload, expiresIn?: string): string => {
  const secret = getJwtSecret();
  const options: SignOptions = {
    expiresIn: (expiresIn || process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, secret, options);
};

const verifyToken = (token: string): TokenPayload => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret) as TokenPayload;
};

export { generateToken, verifyToken };
