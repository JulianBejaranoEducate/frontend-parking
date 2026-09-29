import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.edu.ue.uniparking',
  appName: 'Uni-parking',
  webDir: 'dist/parking/browser',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
