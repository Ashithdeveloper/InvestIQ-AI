import { Platform } from 'react-native';

const TOKEN_KEY = 'investiq_auth_token';

let memoryToken: string | null = null;

const getSecureStore = async () => {
  try {
    return await import('expo-secure-store');
  } catch {
    return null;
  }
};

export const tokenStorage = {
  async getToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(TOKEN_KEY);
        }
      } catch {
        return memoryToken;
      }
    }

    try {
      const SecureStore = await getSecureStore();
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        return await SecureStore.getItemAsync(TOKEN_KEY);
      }
    } catch {
      // Fallback to memory
    }

    return memoryToken;
  },

  async saveToken(token: string): Promise<void> {
    memoryToken = token;

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(TOKEN_KEY, token);
          return;
        }
      } catch {
        // Fallback to memory
        return;
      }
    }

    try {
      const SecureStore = await getSecureStore();
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch {
      // Memory token already stored
    }
  },

  async removeToken(): Promise<void> {
    memoryToken = null;

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(TOKEN_KEY);
          return;
        }
      } catch {
        return;
      }
    }

    try {
      const SecureStore = await getSecureStore();
      if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
      // Memory token already cleared
    }
  },
};
