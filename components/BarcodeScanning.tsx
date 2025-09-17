import React from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { CameraView, CameraType, BarcodeScanningResult } from 'expo-camera';

interface BarcodeScanningProps {
  facing: CameraType;
  onBarcodeScanned: ({ data }: { data: string }) => void;
  scannerActive: boolean;
  style?: any;
  children?: React.ReactNode;
}

export function BarcodeScanning({ 
  facing, 
  onBarcodeScanned, 
  scannerActive, 
  style,
  children 
}: BarcodeScanningProps) {
  const [cameraReady, setCameraReady] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const lastScannedRef = React.useRef<string>('');
  const lastScanTimeRef = React.useRef<number>(0);

  const handleCameraReady = React.useCallback(() => {
    setCameraReady(true);
    setCameraError(null);
  }, []);

  const handleCameraError = React.useCallback((error: any) => {
    console.error('Camera error:', error);
    setCameraError('Camera error occurred');
    setCameraReady(false);
    
    // Show user-friendly error message (only on native platforms)
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Camera Error',
        'There was an issue with the camera. Please restart the app or check camera permissions.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleBarcodeScanned = React.useCallback(
    (result: BarcodeScanningResult) => {
      try {
        // Extract data from the scan result
        const data = result.data || result.raw || '';
        
        if (!data || !scannerActive || !cameraReady) {
          return;
        }

        // Prevent duplicate scans within 2 seconds
        const now = Date.now();
        if (data === lastScannedRef.current && now - lastScanTimeRef.current < 2000) {
          return;
        }

        // Validate QR code format
        const trimmedData = data.trim();
        if (!trimmedData || trimmedData.length === 0) {
          console.log('Invalid QR code: empty or whitespace');
          return;
        }

        // Basic validation for common QR code formats
        if (trimmedData.length < 3 || trimmedData.length > 500) {
          console.log('Invalid QR code: length out of bounds');
          return;
        }

        // Update tracking variables
        lastScannedRef.current = data;
        lastScanTimeRef.current = now;

        // Call the callback with validated data
        onBarcodeScanned({ data: trimmedData });
      } catch (error) {
        console.error('Error processing barcode scan:', error);
        // Don't crash the app, just log the error
      }
    },
    [scannerActive, cameraReady, onBarcodeScanned]
  );

  // Reset tracking when scanner becomes inactive
  React.useEffect(() => {
    if (!scannerActive) {
      lastScannedRef.current = '';
      lastScanTimeRef.current = 0;
    }
  }, [scannerActive]);

  // Don't render camera if scanner is not active or if there's an error
  if (!scannerActive || cameraError) {
    return (
      <View style={[styles.camera, style, { backgroundColor: '#000000' }]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.camera, style]}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        onCameraReady={handleCameraReady}
        onMountError={handleCameraError}
        onBarcodeScanned={cameraReady ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'pdf417', 'ean13', 'ean8', 'code39', 'code128', 'datamatrix'],
        }}
        enableTorch={false}
        zoom={0}
        animateShutter={false}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
});