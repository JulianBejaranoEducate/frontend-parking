import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.edu.ue.uniparking',
  appName: 'parking',
  webDir: 'dist/parking/browser',
  server: {
    androidScheme: 'http',
    cleartext: true
  }
};

export default config;
