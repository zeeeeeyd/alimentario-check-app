import React from 'react';
import { View, StyleSheet } from 'react-native';
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
  return (
    <CameraView
      style={[styles.camera, style]}
      facing={facing}
      onBarcodeScanned={scannerActive ? onBarcodeScanned : undefined}
      barCodeScannerSettings={{
        barCodeTypes: ['qr'],
      }}
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