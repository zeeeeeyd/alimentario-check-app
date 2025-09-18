// ✅ MUST be before any other imports that might use fetch/URL/crypto
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { decode, encode } from 'base-64';
if (typeof atob === 'undefined') {
  // @ts-ignore
  global.atob = decode;
}
if (typeof btoa === 'undefined') {
  // @ts-ignore
  global.btoa = encode;
}

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { testDatabaseConnection, getDatabaseHealth, isSupabaseConfigured, getSupabase } from '@/lib/supabase';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFrameworkReady();

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        // Check if Supabase is configured before proceeding
        if (!isSupabaseConfigured) {
          throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in app.config.js');
        }

        // Add small delay for native platforms to ensure proper initialization
        if (Platform.OS !== 'web') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Quick Supabase ping test
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase.from('visitors').select('*').limit(1);
          console.log('Supabase ping:', { ok: !error, error: error?.message, rowCount: data?.length ?? 0 });
        } catch (pingError) {
          console.warn('Supabase ping failed (non-critical):', pingError);
        }

        // Test database connection
        console.log('Testing database connection...');
        const isConnected = await testDatabaseConnection();
        
        if (!isConnected) {
          throw new Error('Failed to connect to database');
        }

        // Check database health
        const health = await getDatabaseHealth();
        if (!health.isHealthy) {
          console.warn('Database health check failed:', health);
          // Don't throw here, just log the warning
        }

        console.log('Database connection successful');

        // Add a small delay to ensure smooth transition
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (mounted) {
          setIsReady(true);
          // Hide splash screen
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.error('App initialization error:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to initialize app');
          await SplashScreen.hideAsync();
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []);

  // Guard against unconfigured Supabase
  if (!isSupabaseConfigured) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Configuration Required</Text>
        <Text style={styles.errorMessage}>
          Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in app.config.js and rebuild the app.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorSubtext}>
          Please check your internet connection and restart the app.
        </Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});