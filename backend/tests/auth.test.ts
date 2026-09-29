import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';

describe('Authentication System Tests', () => {
  const validUser = {
    username: 'Ashith',
    email: 'ashith@example.com',
    password: 'SecurePassword123',
  };

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully and return JWT and profile status', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(validUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.user.username).toBe(validUser.username);
      expect(response.body.data.user.email).toBe(validUser.email.toLowerCase());
      expect(response.body.data.user.financialProfile).toBeDefined();
      expect(response.body.data.user.financialProfile.isCompleted).toBe(false);
      // Ensure passwordHash is never returned
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should normalize email to lowercase on registration', async () => {
      const userUpper = {
        username: 'AshithCaps',
        email: 'ASHITH.UPPER@EXAMPLE.COM',
        password: 'SecurePassword123',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userUpper);

      expect(response.status).toBe(201);
      expect(response.body.data.user.email).toBe('ashith.upper@example.com');
    });

    it('should return 409 conflict when registering with duplicate email', async () => {
      // First signup
      await request(app).post('/api/auth/signup').send(validUser);

      // Attempt duplicate signup with different case
      const duplicateResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'Ashith Duplicate',
          email: validUser.email.toUpperCase(),
          password: 'AnotherPassword123',
        });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.message).toContain('already exists');
    });

    it('should return 400 when missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'onlyemail@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should return 400 for invalid email address format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'Ashith',
          email: 'invalid-email-format',
          password: 'SecurePassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((e: { field: string }) => e.field === 'email')).toBe(true);
    });

    it('should return 400 if password is too short', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'Ashith',
          email: 'shortpass@example.com',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/signup').send(validUser);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(validUser.email.toLowerCase());
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should login successfully with case-insensitive email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email.toUpperCase(),
          password: validUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should return 401 with generic error message on incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword999',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 with generic error message on non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: validUser.password,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      const signupRes = await request(app).post('/api/auth/signup').send(validUser);
      authToken = signupRes.body.data.token;
    });

    it('should return authenticated user profile when valid JWT is provided', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(validUser.email.toLowerCase());
      expect(response.body.data.username).toBe(validUser.username);
      expect(response.body.data.financialProfile).toBeDefined();
      expect(response.body.data.financialProfile.isCompleted).toBe(false);
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authorization token is missing');
    });

    it('should return 401 when token is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-garbage-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid authentication token');
    });

    it('should return 401 when token has expired', async () => {
      const secret = process.env.JWT_SECRET || 'test_secret_key_for_testing_12345';
      const expiredToken = jwt.sign(
        { userId: '507f1f77bcf86cd799439011', email: 'test@example.com' },
        secret,
        { expiresIn: '-10s' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token has expired');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 indicating successful logout and instructing client token removal', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });
});
