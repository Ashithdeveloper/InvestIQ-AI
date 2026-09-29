import { create } from 'zustand';
import {
  FinancialProfile,
  CreateFinancialProfilePayload,
  UpdateFinancialProfilePayload,
} from '../types';
import { profileApi } from '../services/api/profile.api';

import { useAuthStore } from './useAuthStore';

interface ProfileState {
  profile: FinancialProfile | null;
  isLoading: boolean;
  error: string | null;
  isCompleted: boolean;
  fetchProfile: () => Promise<FinancialProfile | null>;
  createProfile: (payload: CreateFinancialProfilePayload) => Promise<FinancialProfile>;
  updateProfile: (payload: UpdateFinancialProfilePayload) => Promise<FinancialProfile>;
  clearError: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,
  isCompleted: false,

  async fetchProfile(): Promise<FinancialProfile | null> {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileApi.getProfile();
      set({
        profile,
        isCompleted: profile.isCompleted,
        isLoading: false,
        error: null,
      });
      useAuthStore.getState().updateUserFinancialProfile(profile);
      return profile;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch profile';
      set({ isLoading: false, error: msg });
      return null;
    }
  },

  async createProfile(payload: CreateFinancialProfilePayload): Promise<FinancialProfile> {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileApi.createProfile(payload);
      set({
        profile,
        isCompleted: profile.isCompleted,
        isLoading: false,
        error: null,
      });
      useAuthStore.getState().updateUserFinancialProfile(profile);
      return profile;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create profile';
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  async updateProfile(payload: UpdateFinancialProfilePayload): Promise<FinancialProfile> {
    set({ isLoading: true, error: null });
    try {
      const profile = await profileApi.updateProfile(payload);
      set({
        profile,
        isCompleted: profile.isCompleted,
        isLoading: false,
        error: null,
      });
      useAuthStore.getState().updateUserFinancialProfile(profile);
      return profile;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  clearError(): void {
    set({ error: null });
  },
}));
