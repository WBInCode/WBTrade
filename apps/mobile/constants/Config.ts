import Constants from 'expo-constants';

const extra = Constants.expirationDate ? {} : (Constants.expoConfig?.extra || {});

export const Config = {
  API_URL: extra.apiUrl || process.env.API_URL || 'http://localhost:5000/api',
};
