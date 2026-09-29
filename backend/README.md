# InvestIQ - AI Backend Architecture & File Guide

## 1. Directory Tree & File Organization

```
backend/
├── .env                              # Active environment configuration
├── .env.example                      # Template for required environment variables
├── package.json                      # Scripts and npm dependencies
├── tsconfig.json                     # TypeScript compiler configuration (src + tests)
├── tsconfig.build.json               # Production build configuration (excludes tests)
├── jest.config.js                    # Unit and integration test runner settings
│
├── src/                              # Main application source code
│   ├── server.ts                     # Entry point: initializes DB & starts HTTP listener
│   ├── app.ts                        # Express application configuration & global middleware
│   │
│   ├── config/                       # External service configurations
│   │   └── db.ts                     # MongoDB Atlas / Mongoose connection lifecycle
│   │
│   ├── models/                       # Mongoose database schemas & TypeScript interfaces
│   │   ├── User.model.ts             # User credentials, JWT payload, & FinancialProfile subdoc
│   │   ├── Company.model.ts          # Indian companies, ratios, statements & search indexes
│   │   └── ChatSession.model.ts      # User-isolated financial chat history & metadata
│   │
│   ├── validators/                   # Zod request validation schemas
│   │   ├── auth.validator.ts         # Signup & Login payload validation
│   │   ├── profile.validator.ts      # Financial profile setup (age, salary, budget)
│   │   ├── scraper.validator.ts      # Screener.in URL validation
│   │   ├── company.validator.ts      # Search queries, pagination & sector filters
│   │   ├── scenario.validator.ts     # Investment budget & hypothetical % validation
│   │   ├── dashboard.validator.ts    # Dashboard company analysis request validation
│   │   └── ai.validator.ts           # RAG analysis and conversational chat validation
│   │
│   ├── middleware/                   # Express HTTP middleware functions
│   │   ├── auth.middleware.ts        # JWT verification (mandatory & optional auth)
│   │   ├── validate.middleware.ts    # Generic Zod request body validation runner
│   │   └── error.middleware.ts       # Centralized error handler with standardized JSON output
│   │
│   ├── controllers/                  # Route handlers (orchestrates request/response)
│   │   ├── auth.controller.ts        # Signup, Login, Profile retrieval
│   │   ├── profile.controller.ts     # Save and update financial profile
│   │   ├── scraper.controller.ts     # Trigger Playwright scraping & refresh data
│   │   ├── company.controller.ts     # Company exploration, search & sector listings
│   │   ├── analysis.controller.ts    # Deterministic financial metrics endpoint
│   │   ├── dashboard.controller.ts   # Personalized dashboard & profile-tailored analysis
│   │   ├── scenario.controller.ts    # Whole-share scenarios & budget comparisons
│   │   └── ai.controller.ts          # RAG queries, conversational chat & document ingestion
│   │
│   ├── services/                     # Core business logic (Pure functional, no OOP)
│   │   ├── auth.service.ts           # Password hashing (bcrypt) & JWT issuance
│   │   ├── profile.service.ts        # Profile completeness calculation & persistence
│   │   ├── scraper.service.ts        # Playwright scraper for Screener.in (Chrome/Edge/Chromium)
│   │   ├── company.service.ts        # MongoDB company search, filtering & pagination
│   │   ├── analysis.service.ts       # Deterministic calculations (FCF, ROE, D/E, Margins)
│   │   ├── scenario.service.ts       # Whole-share purchase simulation & symmetric risk analysis
│   │   ├── dashboard.service.ts      # Aggregates profile, company analyses & automated risk flags
│   │   │
│   │   ├── rag/                      # RAG (Retrieval-Augmented Generation) Architecture
│   │   │   ├── rag.service.ts        # Main RAG orchestrator (Retrieval + Reasoning pipeline)
│   │   │   ├── ingestion/            # Company document vectorization & Qdrant indexing
│   │   │   ├── embeddings/           # BAAI/bge-small-en-v1.5 embeddings generator (384-d)
│   │   │   ├── retrieval/            # Vector retrieval & chunk relevance scoring
│   │   │   ├── context/              # Chunks company financial statements into searchable text
│   │   │   └── qdrant/               # Qdrant client (collection setup, upsert, filter, cosine search)
│   │   │
│   │   └── ai/                       # AI Model Integrations
│   │       ├── ollama.service.ts     # Ollama Cloud GPT-OSS 4B connector with financial guardrails
│   │       └── chat.service.ts       # Conversational memory engine with user isolation
│   │
│   ├── routes/                       # Express router definitions
│   │   ├── index.ts                  # Central API router registry (mounts all sub-routers)
│   │   ├── auth.routes.ts            # /api/auth/*
│   │   ├── profile.routes.ts         # /api/profile/*
│   │   ├── scraper.routes.ts         # /api/scraper/*
│   │   ├── company.routes.ts         # /api/companies/*
│   │   ├── analysis.routes.ts        # /api/analysis/*
│   │   ├── dashboard.routes.ts       # /api/dashboard/*
│   │   ├── investment.routes.ts      # /api/investment/*
│   │   └── ai.routes.ts              # /api/ai/*
│   │
│   ├── utils/                        # Shared utility functions
│   │   ├── apiResponse.ts            # Standardized API response helpers (sendSuccess, sendError)
│   │   ├── jwt.ts                    # JWT token signing and verification
│   │   └── numberParser.ts           # Indian financial number parsing (Cr, Lakhs, percentages)
│   │
│   └── types/                        # Custom TypeScript ambient type definitions
│       └── express.d.ts              # Extends Express Request with authenticated user payload
│
└── tests/                            # Automated Jest test suites (82+ tests)
    ├── setup.ts                      # Test database lifecycle & test environment configuration
    ├── auth.test.ts                  # Authentication tests (Signup, Login, Token validation)
    ├── profile.test.ts               # Financial profile completion tests
    ├── scraper.test.ts               # Web scraper service and URL validation tests
    ├── company.test.ts               # Company exploration, pagination & sector search tests
    ├── analysis.test.ts              # Deterministic financial calculation tests
    ├── dashboardAndScenario.test.ts  # Personalized dashboard, scenario engine & budget comparison tests
    ├── ragAndAi.test.ts              # Embeddings, Qdrant vectors, RAG pipeline & chat tests
    └── numberParser.test.ts          # Number parsing edge cases & currency conversions
```

---

## 2. Request & Execution Flow

Every request travels through a predictable, modular pipeline:

```
Client Request
      │
      ▼
Express App (src/app.ts)
      │
      ▼
Central Router (src/routes/index.ts)
      │
      ▼
Feature Router (e.g. src/routes/dashboard.routes.ts)
      │
      ├──▶ [Validation Middleware] (src/middleware/validate.middleware.ts + Zod Schema)
      │          └─ If invalid ──▶ Returns 400 with field-level errors
      │
      ├──▶ [Auth Middleware] (src/middleware/auth.middleware.ts)
      │          └─ If invalid ──▶ Returns 401 Unauthorized
      │
      ▼
Controller (e.g. src/controllers/dashboard.controller.ts)
      │
      ▼
Service Layer (e.g. src/services/dashboard.service.ts)
      │
      ├──▶ MongoDB (Mongoose models: User, Company, ChatSession)
      ├──▶ Deterministic Engine (src/services/analysis.service.ts)
      ├──▶ Qdrant Vector DB (src/services/rag/qdrant/qdrant.service.ts)
      └──▶ Ollama Cloud GPT-OSS 4B (src/services/ai/ollama.service.ts)
      │
      ▼
Response Utility (src/utils/apiResponse.ts)
      │
      ▼
Client Response: { success: true, message: "...", data: { ... } }
```

---

## 3. Complete API Endpoint Catalog

| Group | Method | Endpoint | Auth | Purpose |
|---|---|---|---|---|
| **System** | `GET` | `/api/health` | None | Health check endpoint |
| **Auth** | `POST` | `/api/auth/signup` | None | Register new user account |
| **Auth** | `POST` | `/api/auth/login` | None | Authenticate user & receive JWT |
| **Auth** | `GET` | `/api/auth/me` | JWT | Get current user profile |
| **Profile** | `POST` | `/api/profile/financial` | JWT | Create or complete user financial profile |
| **Profile** | `GET` | `/api/profile/financial` | JWT | Retrieve user financial profile |
| **Profile** | `PUT` | `/api/profile/financial` | JWT | Update user financial profile |
| **Scraper** | `POST` | `/api/scraper/company` | None | Scrape company from Screener.in |
| **Scraper** | `POST` | `/api/scraper/company/:id/refresh`| None | Refresh existing company data |
| **Companies**| `GET` | `/api/companies` | None | Paginated list of Indian companies |
| **Companies**| `GET` | `/api/companies/search` | None | Search companies by name or symbol |
| **Companies**| `GET` | `/api/companies/sectors` | None | List all unique sectors |
| **Companies**| `GET` | `/api/companies/:id` | None | Complete company profile by ID or symbol |
| **Analysis** | `GET` | `/api/analysis/company/:id` | None | Deterministic financial metrics & ratios |
| **Dashboard**| `GET` | `/api/dashboard` | JWT | Personalized dashboard based on budget |
| **Dashboard**| `POST` | `/api/dashboard/company-analysis`| Optional| RAG analysis with budget suitability |
| **Investment**| `POST`| `/api/investment/scenario` | None | Whole-share investment simulation |
| **Investment**| `POST`| `/api/investment/compare-budget` | None | Compare two monthly budgets |
| **AI** | `POST` | `/api/ai/company-analysis` | None | General company RAG analysis |
| **AI** | `POST` | `/api/ai/chat` | JWT | Authenticated financial AI chat |
| **AI** | `POST` | `/api/ai/ingest/company/:id` | JWT | Ingest company into Qdrant vector store |

---

## 4. Architectural Rules & Guarantees

1. **Deterministic Calculations First:** Financial figures (ROE, FCF, Debt-to-Equity, margins) and whole-share calculations are executed entirely in code. The AI model is strictly prohibited from fabricating numbers.
2. **Functional Architecture:** No classes or unnecessary OOP. All controllers, services, and utilities are written with `const`, arrow functions, and `async/await`.
3. **Layer Separation:** Routes define URLs and middleware; Controllers manage HTTP status codes; Services contain pure business logic; Models define data schemas; Validators enforce payload types.
4. **Standardized Responses:** All endpoints return `{ success: boolean, message: string, data?: any, errors?: any[] }`.
