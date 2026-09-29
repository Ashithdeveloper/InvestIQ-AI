# InvestIQ - AI: Implementation Plan

## Codebase Audit Summary

### ✅ Already Implemented (Backend)
| Component | Status | Notes |
|---|---|---|
| MongoDB connection | ✅ Complete | `config/database.ts` |
| User model (auth + profile) | ✅ Complete | `models/User.model.ts` |
| Company model | ✅ Complete | `models/Company.model.ts` with full financial schema |
| ChatSession model | ✅ Complete | `models/ChatSession.model.ts` |
| Auth service + JWT | ✅ Complete | Signup, login, me, logout |
| Profile service | ✅ Complete | CRUD for financial profile |
| Scraper service | ✅ Complete | Playwright + Screener.in |
| Company service | ✅ Complete | CRUD, search, sectors, refresh |
| Analysis service | ✅ Complete | Deterministic FCF, ROE, D/E, margins |
| Dashboard service | ✅ Complete | Personalized metrics + risk derivation |
| Scenario service | ✅ Complete | Single scenario + budget comparison |
| RAG ingestion | ✅ Complete | Document generation + embedding + Qdrant |
| RAG retrieval | ✅ Complete | Vector search with memory fallback |
| RAG context | ✅ Complete | Structured document generation |
| Qdrant service | ✅ Complete | With in-memory fallback |
| Embedding service | ✅ Complete | BAAI/bge-small-en-v1.5 with deterministic fallback |
| Ollama AI service | ✅ Complete | GPT-OSS 4B with offline fallback |
| Chat service | ✅ Complete | Session-based RAG chat |
| All routes | ✅ Complete | 8 route modules registered |
| All controllers | ✅ Complete | 8 controllers |
| All validators (Zod) | ✅ Complete | 7 validators |
| Error middleware | ✅ Complete | Centralized error handling |
| Tests | ✅ 100/100 passing | 8 test suites |

### ✅ Already Implemented (Frontend)
| Component | Status | Notes |
|---|---|---|
| Expo + React Native setup | ✅ Complete | SDK 57 |
| API client | ✅ Complete | Auto host detection, JWT interceptor |
| Token storage | ✅ Complete | expo-secure-store |
| All API services | ✅ Complete | 8 API modules |
| All Zustand stores | ✅ Complete | 7 stores |
| Common components | ✅ Complete | Card, Button, Input, MetricBadge, etc. |
| Auth screens | ✅ Complete | Login, Signup |
| Profile screens | ✅ Complete | ProfileSetup, Profile |
| Dashboard screen | ✅ Complete | Personalized dashboard |
| Explore screens | ✅ Complete | ExploreScreen, CompanyDetailScreen |
| Analysis screen | ✅ Complete | Financial metrics view |
| Scenario screen | ✅ Complete | Calculator + comparison |
| Chat screen | ✅ Complete | AI assistant |
| Navigation | ✅ Complete | Auth + App navigators |

### ❌ Missing / Needs Implementation

| Phase | What's Missing | Priority |
|---|---|---|
| **Phase 1** | Background company data initialization on server startup | HIGH |
| **Phase 2** | 50+ Indian company seed list | HIGH |
| **Phase 10** | AI Buy Analysis API + Frontend screen | HIGH |
| **Phase 11** | AI Sell Analysis API + Frontend screen | HIGH |
| **Phase 13** | Safe area fixes across all screens | HIGH |
| **Phase 13** | Keyboard handling fixes | HIGH |
| **Phase 7** | "Invest More" comparison in frontend | MEDIUM |

## Execution Plan

### Step 1: Backend — Company Seed Data + Startup Pipeline
- Create `src/config/companyList.ts` with 55 Indian companies (symbol + Screener URL)
- Create `src/services/ingestion.pipeline.ts` for idempotent background ingestion
- Update `src/server.ts` to run the pipeline after HTTP server starts
- Add ingestion status tracking to Company model

### Step 2: Backend — Buy/Sell Analysis APIs
- Add `POST /api/ai/buy-analysis` endpoint
- Add `POST /api/ai/sell-analysis` endpoint
- Create dedicated service functions using existing RAG pipeline
- Add validators and controller methods

### Step 3: Frontend — Buy/Sell Analysis
- Add `analysis.api.ts` endpoints for buy/sell
- Create BuyAnalysisScreen and SellAnalysisScreen
- Add navigation routes
- Connect to Zustand store

### Step 4: Frontend — UI Fixes
- SafeAreaView for all screens
- KeyboardAvoidingView for forms and chat
- FlatList for company lists
- Bottom tab overlap fixes

### Step 5: Testing + Final Report
