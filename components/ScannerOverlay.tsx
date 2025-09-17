import React from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';

const { width, height } = Dimensions.get('window');
const SCANNER_SIZE = Math.min(width * 0.7, 280);
const SCANNER_TOP = (height - SCANNER_SIZE) / 2 - 100;

interface ScannerOverlayProps {
  isProcessing: boolean;
}

export function ScannerOverlay({ isProcessing }: ScannerOverlayProps) {
  const animatedValue = new Animated.Value(0);
  const pulseAnimation = new Animated.Value(1);
  const rotateAnimation = new Animated.Value(0);

  React.useEffect(() => {
    let scanAnimation: Animated.CompositeAnimation | null = null;
    let pulseAnimationRef: Animated.CompositeAnimation | null = null;
    let rotateAnimationRef: Animated.CompositeAnimation | null = null;

    if (!isProcessing) {
      // Scanning line animation
      scanAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      scanAnimation.start();

      // Corner pulse animation
      pulseAnimationRef = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimationRef.start();
    } else {
      // Processing rotation animation
      rotateAnimationRef = Animated.loop(
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      rotateAnimationRef.start();
    }

    return () => {
      scanAnimation?.stop();
      pulseAnimationRef?.stop();
      rotateAnimationRef?.stop();
    };
  }, [isProcessing]);

  const rotation = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.overlay}>
      {/* Top overlay */}
      <View style={[styles.overlaySection, { height: SCANNER_TOP }]} />
      
      {/* Middle section with scanner */}
      <View style={styles.middleSection}>
        {/* Left overlay */}
        <View style={[styles.overlaySection, { width: (width - SCANNER_SIZE) / 2 }]} />
        
        {/* Scanner area */}
        <View style={styles.scannerContainer}>
          <View style={styles.scannerFrame}>
            {/* Corner indicators with pulse animation */}
            <Animated.View 
              style={[
                styles.corner, 
                styles.topLeft,
                { transform: [{ scale: pulseAnimation }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.corner, 
                styles.topRight,
                { transform: [{ scale: pulseAnimation }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.corner, 
                styles.bottomLeft,
                { transform: [{ scale: pulseAnimation }] }
              ]} 
            />
            <Animated.View 
              style={[
                styles.corner, 
                styles.bottomRight,
                { transform: [{ scale: pulseAnimation }] }
              ]} 
            />
            
            {/* Scanning line */}
            {!isProcessing && (
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: animatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, SCANNER_SIZE - 40],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <View style={styles.processingContainer}>
                <Animated.View
                  style={[
                    styles.processingSpinner,
                    { transform: [{ rotate: rotation }] }
                  ]}
                />
                <View style={styles.processingDots}>
                  <Animated.View 
                    style={[
                      styles.processingDot,
                      styles.dot1,
                      { opacity: animatedValue }
                    ]} 
                  />
                  <Animated.View 
                    style={[
                      styles.processingDot,
                      styles.dot2,
                      { 
                        opacity: animatedValue.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.3, 1, 0.3],
                        })
                      }
                    ]} 
                  />
                  <Animated.View 
                    style={[
                      styles.processingDot,
                      styles.dot3,
                      { 
                        opacity: animatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0],
                        })
                      }
                    ]} 
                  />
                </View>
              </View>
            )}
          </View>
          
          <View style={styles.instructionContainer}>
            <Text style={styles.scannerText}>
              {isProcessing ? 'Processing QR Code...' : 'Position QR code within the frame'}
            </Text>
            {!isProcessing && (
              <Text style={styles.scannerSubtext}>
                Make sure the code is clear and well-lit
              </Text>
            )}
          </View>
        </View>
        
        {/* Right overlay */}
        <View style={[styles.overlaySection, { width: (width - SCANNER_SIZE) / 2 }]} />
      </View>
      
      {/* Bottom overlay */}
      <View style={[styles.overlaySection, { flex: 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleSection: {
    flexDirection: 'row',
    height: SCANNER_SIZE,
  },
  scannerContainer: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: SCANNER_SIZE - 40,
    height: SCANNER_SIZE - 40,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#16A34A',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#16A34A',
    opacity: 0.8,
    borderRadius: 2,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  processingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#16A34A',
    borderRightColor: '#16A34A',
    marginBottom: 16,
  },
  processingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  processingDot: {
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
  instructionContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  scannerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scannerSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});