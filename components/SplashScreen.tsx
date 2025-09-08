import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export function CustomSplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={{ uri: 'https://res.cloudinary.com/dxn9h9afz/image/upload/v1738239252/alimentario/WhatsApp_Image_2025-01-30_at_13.12.59_0d05ac7c_iu17hi.jpg' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Alimentario</Text>
        <Text style={styles.subtitle}>Check-in System</Text>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.loadingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#EA580C',
    fontWeight: '500',
  },
  footer: {
    paddingBottom: 60,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
});