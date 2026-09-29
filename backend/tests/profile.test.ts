import request from 'supertest';
import app from '../src/app';

describe('Financial Profile Management Tests', () => {
  let userTokenA: string;
  let userIdA: string;
  let userTokenB: string;
  let userIdB: string;

  const validProfileData = {
    age: 21,
    monthlySalary: 25000,
    monthlyInvestmentBudget: 5000,
  };

  beforeEach(async () => {
    // Register User A
    const resA = await request(app).post('/api/auth/signup').send({
      username: 'UserA',
      email: 'usera@example.com',
      password: 'Password123',
    });
    userTokenA = resA.body.data.token;
    userIdA = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/auth/signup').send({
      username: 'UserB',
      email: 'userb@example.com',
      password: 'Password123',
    });
    userTokenB = resB.body.data.token;
    userIdB = resB.body.data.user.id;
  });

  describe('GET /api/profile/financial - Initial state', () => {
    it('should return initial incomplete profile for newly registered user', async () => {
      const response = await request(app)
        .get('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(userIdA);
      expect(response.body.data.financialProfile).toEqual({
        age: null,
        monthlySalary: null,
        monthlyInvestmentBudget: null,
        currency: 'INR',
        isCompleted: false,
      });
    });

    it('should reject unauthenticated request with 401', async () => {
      const response = await request(app).get('/api/profile/financial');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/profile/financial - Setup Profile', () => {
    it('should save financial profile and mark isCompleted to true', async () => {
      const response = await request(app)
        .post('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send(validProfileData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Financial profile saved successfully');
      expect(response.body.data.userId).toBe(userIdA);
      expect(response.body.data.financialProfile).toEqual({
        age: 21,
        monthlySalary: 25000,
        monthlyInvestmentBudget: 5000,
        currency: 'INR',
        isCompleted: true,
      });

      // Verify that GET /api/auth/me also reflects profile completion
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userTokenA}`);

      expect(meResponse.body.data.financialProfile.isCompleted).toBe(true);
    });

    it('should reject profile setup if age is below minimum eligible age (e.g. 17)', async () => {
      const response = await request(app)
        .post('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          ...validProfileData,
          age: 17,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject profile setup if age is a decimal number', async () => {
      const response = await request(app)
        .post('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          ...validProfileData,
          age: 21.5,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject profile setup if monthly salary is negative', async () => {
      const response = await request(app)
        .post('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          ...validProfileData,
          monthlySalary: -1000,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject profile setup if monthly investment budget is negative', async () => {
      const response = await request(app)
        .post('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          ...validProfileData,
          monthlyInvestmentBudget: -500,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject profile setup if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          age: 25,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/profile/financial - Update Profile', () => {
    beforeEach(async () => {
      // Complete initial profile setup for User A
      await request(app)
        .post('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send(validProfileData);
    });

    it('should update specific fields successfully', async () => {
      const response = await request(app)
        .put('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          monthlyInvestmentBudget: 8000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.financialProfile.monthlyInvestmentBudget).toBe(8000);
      expect(response.body.data.financialProfile.age).toBe(21);
      expect(response.body.data.financialProfile.monthlySalary).toBe(25000);
      expect(response.body.data.financialProfile.isCompleted).toBe(true);
    });

    it('should validate updated values on PUT', async () => {
      const response = await request(app)
        .put('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          monthlySalary: -5000,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject empty update request payload', async () => {
      const response = await request(app)
        .put('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('User Isolation and Security', () => {
    it('should strictly isolate financial profiles between different users', async () => {
      // User A sets profile
      await request(app)
        .post('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`)
        .send({
          age: 25,
          monthlySalary: 50000,
          monthlyInvestmentBudget: 10000,
        });

      // User B sets different profile
      await request(app)
        .post('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenB}`)
        .send({
          age: 30,
          monthlySalary: 90000,
          monthlyInvestmentBudget: 25000,
        });

      // User A fetches their profile
      const resA = await request(app)
        .get('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenA}`);

      expect(resA.body.data.userId).toBe(userIdA);
      expect(resA.body.data.financialProfile.age).toBe(25);
      expect(resA.body.data.financialProfile.monthlySalary).toBe(50000);

      // User B fetches their profile
      const resB = await request(app)
        .get('/api/profile/financial')
        .set('Authorization', `Bearer ${userTokenB}`);

      expect(resB.body.data.userId).toBe(userIdB);
      expect(resB.body.data.financialProfile.age).toBe(30);
      expect(resB.body.data.financialProfile.monthlySalary).toBe(90000);
    });
  });
});
