import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const Config = {
  API_URL: extra.apiUrl || 'https://wbtradeprod.onrender.com/api',
};
