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

  React.useEffect(() => {
    const animate = () => {
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
      ]).start(animate);
    };

    if (!isProcessing) {
      animate();
    }

    return () => animatedValue.stopAnimation();
  }, [isProcessing]);

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
            {/* Corner indicators */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
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
          </View>
          
          <Text style={styles.scannerText}>
            {isProcessing ? 'Processing...' : 'Position QR code in the frame'}
          </Text>
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
  },
  scannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
});