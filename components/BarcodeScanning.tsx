import React from 'react';
import { StyleSheet } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';

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
  const handleBarcodeScanned = React.useCallback(
    ({ data }: { data: string }) => {
      if (scannerActive && data) {
        onBarcodeScanned({ data });
      }
    },
    [scannerActive, onBarcodeScanned]
  );

  return (
    <CameraView
      style={[styles.camera, style]}
      facing={facing}
      onBarcodeScanned={handleBarcodeScanned}
      barCodeScannerSettings={{
        barCodeTypes: ['qr'],
      }}
      enableTorch={false}
      zoom={0}
    >
      {children}
    </CameraView>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
});