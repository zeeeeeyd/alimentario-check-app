import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, Modal, ScrollView, AppState, AppStateStatus } from 'react-native';
import { CameraType, useCameraPermissions } from 'expo-camera';
import { findVisitorByQRCode, VisitorWithScans, VISITOR_TYPES, VisitorType } from '@/lib/supabase';
import { UserInfoCard } from '@/components/UserInfoCard';
import { ScannerOverlay } from '@/components/ScannerOverlay';
import { BarcodeScanning } from '@/components/BarcodeScanning';
import { Scan, RotateCcw, Users, ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react-native';

const { width } = Dimensions.get('window');

function ScannerScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(true);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [visitorInfo, setVisitorInfo] = useState<VisitorWithScans | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [selectedVisitorType, setSelectedVisitorType] = useState<VisitorType>('visitors');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanCooldown, setScanCooldown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const didCancelRef = React.useRef(false);
  const processingTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      didCancelRef.current = true;
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Reset error state when app becomes active
        setError(null);
        if (!scannerActive && !isProcessing && !visitorInfo) {
          setScannerActive(true);
          setCameraActive(true);
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Pause scanner when app goes to background
        setScannerActive(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [scannerActive, isProcessing, visitorInfo]);
  
  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <AlertTriangle size={48} color="#EA580C" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need camera permission to scan QR codes. Please grant permission to continue.
        </Text>
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
      setCameraActive(false);
      setScanCooldown(true);
      setScannedData(data);
      setLastScannedCode(data);
      setError(null);
      
      // Set cooldown period to prevent rapid successive scans
      setTimeout(() => {
        if (!didCancelRef.current) {
          setScanCooldown(false);
        }
      }, 1500);

      // Set processing timeout
      processingTimeoutRef.current = setTimeout(() => {
        if (!didCancelRef.current && isProcessing) {
          setError('Processing timeout. Please try again.');
          setIsProcessing(false);
          resetScanner();
        }
      }, 10000); // 10 second timeout
    }

    try {
      // Search for visitor across all tables
      const visitor = await findVisitorByQRCode(data);
      
      if (visitor && !didCancelRef.current) {
        // Clear timeout
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }
        
        // Visitor found - display their information
        setVisitorInfo(visitor);
        setRetryCount(0);
      } else if (!didCancelRef.current) {
        // Clear timeout
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }
        
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
        setRetryCount(0);
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      if (!didCancelRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(`Scanning failed: ${errorMessage}`);
        
        // Implement retry logic
        if (retryCount < 2) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            if (!didCancelRef.current) {
              resetScanner();
            }
          }, 2000);
        } else {
          Alert.alert(
            'Scanning Error', 
            'Failed to process QR code after multiple attempts. Please ensure the code is clear and try again.',
            [
              { text: 'Try Again', onPress: resetScanner },
              { text: 'Cancel', onPress: resetScanner, style: 'cancel' }
            ]
          );
        }
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
      setCameraActive(true);
      setScanCooldown(false);
      setIsProcessing(false);
      setError(null);
      
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    }
  };

  const toggleCameraFacing = () => {
    try {
      setFacing(current => (current === 'back' ? 'front' : 'back'));
    } catch (error) {
      console.error('Error toggling camera:', error);
      Alert.alert('Camera Error', 'Failed to switch camera. Please try restarting the app.');
    }
  };

  const selectVisitorType = (type: VisitorType) => {
    if (!didCancelRef.current) {
      setSelectedVisitorType(type);
      setShowTypeSelector(false);
    }
  };

  const retryScanning = () => {
    setRetryCount(0);
    resetScanner();
  };

  if (visitorInfo) {
    return (
      <View style={styles.container}>
        <UserInfoCard visitor={visitorInfo} onClose={resetScanner} />
      </View>
    );
  }

  if (error && !isProcessing) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle size={64} color="#EA580C" />
        <Text style={styles.errorTitle}>Scanning Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={retryScanning}>
            <RefreshCw size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={resetScanner}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
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

      {cameraActive ? (
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
              disabled={isProcessing}
            >
              <RotateCcw size={24} color={isProcessing ? "#6B7280" : "#FFFFFF"} />
            </TouchableOpacity>
          </View>
        </BarcodeScanning>
      ) : (
        <View style={styles.camera} />
      )}

      <View style={styles.footer}>
        <Scan size={32} color="#16A34A" />
        <Text style={styles.footerText}>
          {isProcessing 
            ? `Processing${retryCount > 0 ? ` (Attempt ${retryCount + 1}/3)` : ''}...` 
            : 'Align QR code within the frame'}
        </Text>
        <Text style={styles.footerSubtext}>
          Scanning for: {VISITOR_TYPES[selectedVisitorType]}
        </Text>
        {error && (
          <Text style={styles.errorFooter}>
            {error}
          </Text>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6B7280',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6B7280',
    lineHeight: 24,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  cancelButtonText: {
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
  errorFooter: {
    marginTop: 8,
    fontSize: 14,
    color: '#EA580C',
    textAlign: 'center',
    fontWeight: '500',
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

export default ScannerScreen;