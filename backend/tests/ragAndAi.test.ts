import request from 'supertest';
import app from '../src/app';
import Company, { ICompany } from '../src/models/Company.model';
import User from '../src/models/User.model';
import ChatSession from '../src/models/ChatSession.model';
import { generateEmbedding, EMBEDDING_DIMENSION } from '../src/services/embedding.service';
import { generateRagDocuments } from '../src/services/ragDocument.service';
import {
  upsertDocuments,
  searchSimilarDocuments,
  deleteCompanyDocuments,
} from '../src/services/qdrant.service';

describe('RAG, Ingestion, and AI Integration Tests', () => {
  let sampleCompany: ICompany;
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    await Company.deleteMany({});
    await User.deleteMany({});
    await ChatSession.deleteMany({});

    // Register a test user
    const signupRes = await request(app).post('/api/auth/signup').send({
      username: 'InvestorAshith',
      email: 'ashith.investor@example.com',
      password: 'StrongPassword123',
    });
    userToken = signupRes.body.data.token;
    userId = signupRes.body.data.user.id;

    // Create test company
    sampleCompany = await Company.create({
      companyName: 'Tata Consultancy Services Ltd',
      symbol: 'TCS',
      sector: 'Information Technology',
      profileUrl: 'https://www.screener.in/company/TCS/consolidated/',
      exchange: ['NSE', 'BSE'],
      marketCap: 734985,
      sharePrice: 2032,
      high52Week: 3350,
      low52Week: 1976,
      financialMetrics: {
        revenue: 240893,
        netProfit: 46099,
        freeCashFlow: 38500,
        roe: 51.8,
        roce: 63.0,
        debtToEquity: 0.08,
        peRatio: 13.7,
        bookValue: 296,
        dividendYield: 3.15,
        opm: 26.2,
        eps: 125.4,
      },
      financialStatements: [
        {
          statementType: 'ProfitAndLoss',
          reportingPeriods: ['Mar 2023', 'Mar 2024'],
          rows: [
            { metricName: 'Sales', values: [225458, 240893] },
            { metricName: 'Net Profit', values: [42147, 46099] },
          ],
        },
      ],
      dataSource: 'Screener.in',
      lastUpdated: new Date(),
    });
  });

  describe('Embedding Service (BAAI/bge-small-en-v1.5)', () => {
    it('should generate embeddings with exactly 384 dimensions', async () => {
      const vector = await generateEmbedding('Tata Consultancy Services Ltd financial analysis');

      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBe(EMBEDDING_DIMENSION);
      expect(vector.length).toBe(384);
      expect(vector.every((v) => typeof v === 'number' && !isNaN(v))).toBe(true);
    });

    it('should generate unit vector length for empty or short text safely', async () => {
      const emptyVec = await generateEmbedding('');
      expect(emptyVec.length).toBe(384);
    });
  });

  describe('RAG Document Preparation', () => {
    it('should convert company data into structured RAG documents with metadata', () => {
      const docs = generateRagDocuments(sampleCompany);

      expect(docs.length).toBeGreaterThan(0);
      const overviewDoc = docs.find((d) => d.documentType === 'company_overview');
      expect(overviewDoc).toBeDefined();
      expect(overviewDoc?.companyName).toBe('Tata Consultancy Services Ltd');
      expect(overviewDoc?.content).toContain('Market Capitalization');
      expect(overviewDoc?.content).toContain('7,34,985 Cr');
      expect(overviewDoc?.metadata.companyId).toBe(sampleCompany._id.toString());
      expect(overviewDoc?.source).toBe('Screener.in');
    });
  });

  describe('Qdrant Vector Ingestion & Search', () => {
    it('should upsert and search vectors by company filtering', async () => {
      const docs = generateRagDocuments(sampleCompany);
      const embeddings = await Promise.all(docs.map((d) => generateEmbedding(d.content)));

      const { count } = await upsertDocuments(docs, embeddings);
      expect(count).toBe(docs.length);

      const queryVec = await generateEmbedding('What is the market capitalization of TCS?');
      const searchResults = await searchSimilarDocuments(queryVec, {
        companyId: sampleCompany._id.toString(),
        symbol: 'TCS',
        limit: 3,
      });

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].payload.companyId).toBe(sampleCompany._id.toString());
      expect(searchResults[0].payload.symbol).toBe('TCS');
    });

    it('should delete company vectors cleanly to prevent duplicate ingestion', async () => {
      const docs = generateRagDocuments(sampleCompany);
      const embeddings = await Promise.all(docs.map((d) => generateEmbedding(d.content)));
      await upsertDocuments(docs, embeddings);

      await deleteCompanyDocuments(sampleCompany._id.toString());

      const queryVec = await generateEmbedding('TCS');
      const searchResults = await searchSimilarDocuments(queryVec, {
        companyId: sampleCompany._id.toString(),
      });

      expect(searchResults.length).toBe(0);
    });
  });

  describe('POST /api/ai/company-analysis - RAG Analysis', () => {
    it('should generate structured financial analysis using RAG pipeline', async () => {
      const response = await request(app)
        .post('/api/ai/company-analysis')
        .send({
          companyId: sampleCompany._id.toString(),
          query: 'Evaluate TCS profitability and cash flows',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.company.symbol).toBe('TCS');
      expect(response.body.data.metrics.freeCashFlow.value).toBe(38500);
      expect(response.body.data.answer).toBeDefined();
      expect(response.body.data.sources).toContain('Screener.in');
      expect(response.body.data.retrievedChunksCount).toBeGreaterThan(0);
    });

    it('should reject requests with missing query or companyId', async () => {
      const response = await request(app)
        .post('/api/ai/company-analysis')
        .send({ companyId: sampleCompany._id.toString() });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/chat - Financial Chat API', () => {
    it('should require JWT authentication', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send({
          companyId: sampleCompany._id.toString(),
          message: 'What is the debt to equity ratio?',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should process authenticated financial chat and maintain session', async () => {
      // Message 1 (Create session)
      const res1 = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          companyId: sampleCompany._id.toString(),
          message: 'What is the return on equity for TCS?',
        });

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.sessionId).toBeDefined();
      expect(res1.body.data.answer).toBeDefined();
      expect(res1.body.data.sources).toContain('Screener.in');

      const sessionId = res1.body.data.sessionId;

      // Message 2 (Follow up within same session)
      const res2 = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          sessionId,
          companyId: sampleCompany._id.toString(),
          message: 'How does that compare to its debt level?',
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.sessionId).toBe(sessionId);
      expect(res2.body.data.conversationHistoryLength).toBe(4); // 2 user + 2 assistant
    });

    it('should isolate chat sessions across different users', async () => {
      // Create chat session as User 1
      const resUser1 = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          companyId: sampleCompany._id.toString(),
          message: 'Tell me about TCS',
        });
      const user1SessionId = resUser1.body.data.sessionId;

      // Sign up User 2
      const user2Signup = await request(app).post('/api/auth/signup').send({
        username: 'UserTwo',
        email: 'user2@example.com',
        password: 'Password123',
      });
      const user2Token = user2Signup.body.data.token;

      // User 2 attempts to send message to User 1's sessionId
      const resUser2 = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          sessionId: user1SessionId,
          companyId: sampleCompany._id.toString(),
          message: 'Trying to snoop on user 1 session',
        });

      expect(resUser2.status).toBe(403);
      expect(resUser2.body.success).toBe(false);
      expect(resUser2.body.message).toContain('Unauthorized access');
    });
  });

  describe('POST /api/ai/ingest/company/:id - Ingestion Endpoint', () => {
    it('should require authentication for vector ingestion', async () => {
      const response = await request(app).post(
        `/api/ai/ingest/company/${sampleCompany._id}`
      );

      expect(response.status).toBe(401);
    });

    it('should ingest company financial documents and return document count', async () => {
      const response = await request(app)
        .post(`/api/ai/ingest/company/${sampleCompany._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companyId).toBe(sampleCompany._id.toString());
      expect(response.body.data.symbol).toBe('TCS');
      expect(response.body.data.documentsGenerated).toBeGreaterThan(0);
      expect(response.body.data.vectorsStored).toBeGreaterThan(0);
    });
  });
});
