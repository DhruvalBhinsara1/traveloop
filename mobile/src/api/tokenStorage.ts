import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const AUTH_TOKEN_KEY = 'traveloop.token';
export const LEGACY_AUTH_TOKEN_KEY = 'token';

const legacyKeys = [AUTH_TOKEN_KEY, LEGACY_AUTH_TOKEN_KEY];

const getSecureToken = async () => {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const setSecureToken = async (token: string) => {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
};

const deleteSecureToken = async () => {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch {
    // AsyncStorage cleanup below still removes legacy and fallback tokens.
  }
};

export const getAuthToken = async () => {
  const secureToken = await getSecureToken();
  if (secureToken) return secureToken;

  const legacyToken = (await AsyncStorage.getItem(AUTH_TOKEN_KEY)) ?? (await AsyncStorage.getItem(LEGACY_AUTH_TOKEN_KEY));
  if (legacyToken) {
    const storedSecurely = await setSecureToken(legacyToken);
    if (storedSecurely) {
      await AsyncStorage.multiRemove(legacyKeys);
    }
  }

  return legacyToken;
};

export const setAuthToken = async (token: string) => {
  const storedSecurely = await setSecureToken(token);
  if (storedSecurely) {
    await AsyncStorage.multiRemove(legacyKeys);
  } else {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

export const clearAuthToken = async () => {
  await deleteSecureToken();
  await AsyncStorage.multiRemove(legacyKeys);
};
