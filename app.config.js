export default {
  expo: {
    name: 'Alimentario Check-in',
    slug: 'alimentario-checkin',
    version: '1.0.0',
    orientation: 'portrait',
    icon: 'https://res.cloudinary.com/dxn9h9afz/image/upload/v1738239252/alimentario/WhatsApp_Image_2025-01-30_at_13.12.59_0d05ac7c_iu17hi.jpg',
    scheme: 'alimentario',
    userInterfaceStyle: 'automatic',
    splash: {
      image: 'https://res.cloudinary.com/dxn9h9afz/image/upload/v1738239252/alimentario/WhatsApp_Image_2025-01-30_at_13.12.59_0d05ac7c_iu17hi.jpg',
      resizeMode: 'contain',
      backgroundColor: '#16A34A'
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
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO'
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
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: '01150845-f799-4c7f-bf65-414957ded54f'
      }
    },
    owner: 'zeyd',
    runtimeVersion: {
      policy: 'appVersion'
    }
  }
};