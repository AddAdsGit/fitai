import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fitai.app',
  appName: 'FitAI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
