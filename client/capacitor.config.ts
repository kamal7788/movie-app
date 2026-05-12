import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.streamflix.app',
  appName: 'StreamFlix Pro',
  webDir: 'build',
  server: {
    url: 'https://streamflix.2bd.net',
    cleartext: true
  }
};

export default config;
