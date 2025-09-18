// app.config.js
// Reads secrets from process.env at build time (EAS Secrets) and forwards them
// into expo.extra so they are available at runtime via expo-constants.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://emcxljscwtkbbgkkcycy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY3hsanNjd3RrYmJna2tjeWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzExMzgsImV4cCI6MjA2ODAwNzEzOH0.gO9PVvowXwh0eP5w0GrwRryx2Fcf2DcSA5qDdE-Q4e8';

export default {
  expo: {
    name: 'Alimentario Check-in',
    slug: 'bolt-expo-nativewind',               // ← must match the linked EAS project
    version: '1.0.0',
    orientation: 'portrait',
    icon: 'https://res.cloudinary.com/dxn9h9afz/image/upload/v1758221463/Eventor/Fichier_77_iyegjn.png',
    scheme: 'alimentario',
    userInterfaceStyle: 'automatic',
    splash: {
      image: 'https://res.cloudinary.com/dxn9h9afz/image/upload/v1738239252/alimentario/WhatsApp_Image_2025-01-30_at_13.12.59_0d05ac7c_iu17hi.jpg',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.alimentario.checkin'
    },
    android: {
      package: 'com.alimentario.checkin',
      adaptiveIcon: {
        foregroundImage: 'https://res.cloudinary.com/dxn9h9afz/image/upload/v1738239252/alimentario/WhatsApp_Image_2025-01-30_at_13.12.59_0d05ac7c_iu17hi.jpg',
        backgroundColor: '#16A34A'
      },
      permissions: [
        'android.permission.CAMERA'
        // Remove RECORD_AUDIO if you don't actually record audio
        // 'android.permission.RECORD_AUDIO'
      ]
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: 'https://res.cloudinary.com/dxn9h9afz/image/upload/v1738239252/alimentario/WhatsApp_Image_2025-01-30_at_13.12.59_0d05ac7c_iu17hi.jpg'
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-web-browser',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow Alimentario to access your camera to scan QR codes.',
          microphonePermission: false,
          recordAudioAndroid: false
        }
      ]
    ],
    experiments: { typedRoutes: true },
    extra: {
      router: {},
      eas: { projectId: '01150845-f799-4c7f-bf65-414957ded54f' }, 
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    },
    owner: 'zeyd',
    runtimeVersion: { policy: 'appVersion' }
  }
};
