import { create } from 'zustand';
import { Company } from '../types';
import { companyApi } from '../services/api/company.api';

interface CompanyState {
  companies: Company[];
  selectedCompany: Company | null;
  sectors: string[];
  activeSector: string | null;
  searchQuery: string;
  page: number;
  totalPages: number;
  totalCount: number;
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  fetchCompanies: (options?: { page?: number; sector?: string; search?: string }) => Promise<void>;
  searchCompanies: (query: string) => Promise<void>;
  fetchCompanyDetails: (idOrSymbol: string) => Promise<Company | null>;
  fetchSectors: () => Promise<void>;
  setActiveSector: (sector: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearSelectedCompany: () => void;
  clearError: () => void;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  selectedCompany: null,
  sectors: [],
  activeSector: null,
  searchQuery: '',
  page: 1,
  totalPages: 1,
  totalCount: 0,
  isLoading: false,
  isLoadingDetails: false,
  error: null,

  async fetchCompanies(options = {}): Promise<void> {
    set({ isLoading: true, error: null });
    try {
      const page = options.page ?? get().page;
      const sector = options.sector !== undefined ? options.sector : get().activeSector || undefined;
      const search = options.search !== undefined ? options.search : get().searchQuery || undefined;

      const res = await companyApi.getCompanies({
        page,
        limit: 10,
        sector,
        search,
      });

      set({
        companies: res.companies,
        page: res.pagination.page,
        totalPages: res.pagination.totalPages,
        totalCount: res.pagination.total,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch companies';
      set({ isLoading: false, error: msg });
    }
  },

  async searchCompanies(query: string): Promise<void> {
    set({ searchQuery: query, isLoading: true, error: null });
    try {
      if (!query.trim()) {
        await get().fetchCompanies({ page: 1, search: '' });
        return;
      }
      const res = await companyApi.searchCompanies(query, 1, 15);
      set({
        companies: res.companies,
        page: res.pagination.page,
        totalPages: res.pagination.totalPages,
        totalCount: res.pagination.total,
        isLoading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      set({ isLoading: false, error: msg });
    }
  },

  async fetchCompanyDetails(idOrSymbol: string): Promise<Company | null> {
    set({ isLoadingDetails: true, error: null });
    try {
      const company = await companyApi.getCompanyById(idOrSymbol);
      set({ selectedCompany: company, isLoadingDetails: false, error: null });
      return company;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load company details';
      set({ isLoadingDetails: false, error: msg });
      return null;
    }
  },

  async fetchSectors(): Promise<void> {
    try {
      const sectors = await companyApi.getSectors();
      set({ sectors });
    } catch {
      // Non-critical
    }
  },

  setActiveSector(sector: string | null): void {
    set({ activeSector: sector, page: 1 });
    get().fetchCompanies({ page: 1, sector: sector || undefined });
  },

  setSearchQuery(query: string): void {
    set({ searchQuery: query });
  },

  clearSelectedCompany(): void {
    set({ selectedCompany: null });
  },

  clearError(): void {
    set({ error: null });
  },
}));
