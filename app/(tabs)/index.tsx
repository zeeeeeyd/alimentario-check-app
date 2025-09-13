import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, Modal, ScrollView } from 'react-native';
import { CameraType, useCameraPermissions } from 'expo-camera';
import { findVisitorByQRCode, VisitorWithScans, VISITOR_TYPES, VisitorType } from '@/lib/supabase';
import { UserInfoCard } from '@/components/UserInfoCard';
import { ScannerOverlay } from '@/components/ScannerOverlay';
import { BarcodeScanning } from '@/components/BarcodeScanning';
import { Scan, RotateCcw, Users, ChevronDown } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function ScannerScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [visitorInfo, setVisitorInfo] = useState<VisitorWithScans | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [selectedVisitorType, setSelectedVisitorType] = useState<VisitorType>('visitors');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanCooldown, setScanCooldown] = useState(false);

  const didCancelRef = React.useRef(false);

  React.useEffect(() => {
    return () => {
      didCancelRef.current = true;
    };
  }, []);
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need camera permission to scan QR codes</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    // Prevent duplicate scans and ensure minimum time between scans
    if (isProcessing || !scannerActive || scanCooldown || data === lastScannedCode) return;
    
    // Validate QR code format (basic validation)
    if (!data || data.trim().length === 0) {
      console.log('Invalid QR code: empty or whitespace');
      return;
    }
    
    if (!didCancelRef.current) {
      setIsProcessing(true);
      setScannerActive(false);
      setScanCooldown(true);
      setScannedData(data);
      setLastScannedCode(data);
      
      // Set cooldown period to prevent rapid successive scans
      setTimeout(() => {
        if (!didCancelRef.current) {
          setScanCooldown(false);
        }
      }, 1000);
    }

    try {
      // Search for visitor across all tables
      const visitor = await findVisitorByQRCode(data);
      
      if (visitor && !didCancelRef.current) {
        // Visitor found - display their information
        setVisitorInfo(visitor);
      } else if (!didCancelRef.current) {
        // Visitor not found - show as new/unregistered
        setVisitorInfo({
          id: 'new',
          full_name: 'Unregistered User',
          email: '',
          phone: '',
          qr_code: data,
          badge_downloaded: false,
          created_at: '',
          visitor_type: selectedVisitorType,
          total_scans: 0,
          today_scans: 0,
          last_scan: '',
        });
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      if (!didCancelRef.current) {
        Alert.alert(
          'Scanning Error', 
          'Failed to process QR code. Please ensure the code is clear and try again.',
          [{ text: 'OK', onPress: resetScanner }]
        );
      }
    } finally {
      if (!didCancelRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const resetScanner = () => {
    if (!didCancelRef.current) {
      setScannedData(null);
      setVisitorInfo(null);
      setLastScannedCode('');
      setScannerActive(true);
      setScanCooldown(false);
    }
  };
      if (!didCancelRef.current) {
        resetScanner();
      }
    } finally {
      if (!didCancelRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const resetScanner = () => {
    if (!didCancelRef.current) {
      setScannedData(null);
      setVisitorInfo(null);
      setScannerActive(true);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const selectVisitorType = (type: VisitorType) => {
    if (!didCancelRef.current) {
      setSelectedVisitorType(type);
      setShowTypeSelector(false);
    }
  };

  if (visitorInfo) {
    return (
      <View style={styles.container}>
        <UserInfoCard visitor={visitorInfo} onClose={resetScanner} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Visitor Type Selector */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.typeSelector}
          onPress={() => setShowTypeSelector(true)}
        >
          <Users size={20} color="#16A34A" />
          <Text style={styles.typeSelectorText}>
            {VISITOR_TYPES[selectedVisitorType]}
          </Text>
          <ChevronDown size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <BarcodeScanning
        facing={facing}
        onBarcodeScanned={handleBarcodeScanned}
        scannerActive={scannerActive}
        style={styles.camera}
      >
        <ScannerOverlay isProcessing={isProcessing} />
        
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleCameraFacing}
          >
            <RotateCcw size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </BarcodeScanning>

      <View style={styles.footer}>
        <Scan size={32} color="#16A34A" />
        <Text style={styles.footerText}>
          {isProcessing ? 'Processing...' : 'Align QR code within the frame'}
        </Text>
        <Text style={styles.footerSubtext}>
          Scanning for: {VISITOR_TYPES[selectedVisitorType]}
        </Text>
      </View>

      {/* Visitor Type Selection Modal */}
      <Modal
        visible={showTypeSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTypeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Visitor Type</Text>
            <ScrollView style={styles.typeList}>
              {Object.entries(VISITOR_TYPES).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.typeOption,
                    selectedVisitorType === key && styles.selectedTypeOption
                  ]}
                  onPress={() => selectVisitorType(key as VisitorType)}
                >
                  <Text style={[
                    styles.typeOptionText,
                    selectedVisitorType === key && styles.selectedTypeOptionText
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTypeSelector(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  typeSelectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#374151',
  },
  permissionButton: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'column',
    gap: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  footerText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  typeList: {
    paddingHorizontal: 20,
  },
  typeOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedTypeOption: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  selectedTypeOptionText: {
    color: '#FFFFFF',
  },
  modalCloseButton: {
    margin: 20,
    backgroundColor: '#6B7280',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});