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

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native';
import { VisitorWithScans, VISITOR_TYPES, updateBadgeDownloaded, getVisitorScanStats } from '@/lib/supabase';
import { X, User, Mail, Phone, Calendar, Building, MapPin, Badge, Download, ChartBar as BarChart3, Clock } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface UserInfoCardProps {
  visitor: VisitorWithScans;
  onClose: () => void;
}

export function UserInfoCard({ visitor, onClose }: UserInfoCardProps) {
  const isNewUser = visitor.id === 'new';
  const [badgeDownloaded, setBadgeDownloaded] = React.useState(visitor.badge_downloaded);
  const [scanStats, setScanStats] = React.useState<{ total: number; today: number; byDate: Record<string, number> }>({ total: 0, today: 0, byDate: {} });
  const scaleAnim = new Animated.Value(0);

  const didCancelRef = React.useRef(false);

  React.useEffect(() => {
    const cleanup = () => {
      didCancelRef.current = true;
    };

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Load scan statistics for existing users
    if (!isNewUser) {
      loadScanStats();
    }

    return cleanup;
  }, []);

  const loadScanStats = async () => {
    if (isNewUser) return;
    const stats = await getVisitorScanStats(visitor.id, visitor.visitor_type);
    if (!didCancelRef.current) {
      setScanStats(stats);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadBadge = async () => {
    if (isNewUser || badgeDownloaded) return;
    
    const success = await updateBadgeDownloaded(visitor.visitor_type, visitor.id);
    if (success && !didCancelRef.current) {
      setBadgeDownloaded(true);
    }
  };

  const getVisitorSpecificInfo = () => {
    switch (visitor.visitor_type) {
      case 'professional_visitors':
        return [
          { icon: Building, label: 'Profession', value: (visitor as any).profession },
          { icon: Building, label: 'Company', value: (visitor as any).company }
        ];
      case 'press':
        return [
          { icon: Building, label: 'Media Outlet', value: (visitor as any).media_outlet },
          { icon: Badge, label: 'Position', value: (visitor as any).position },
          { icon: Badge, label: 'Press Card', value: (visitor as any).press_card_number }
        ];
      case 'exhibitors':
        return [
          { icon: Building, label: 'Company', value: (visitor as any).company },
          { icon: Badge, label: 'Position', value: (visitor as any).position },
          { icon: MapPin, label: 'Booth', value: (visitor as any).booth_number }
        ];
      case 'staff':
        return [
          { icon: Building, label: 'Department', value: (visitor as any).department },
          { icon: Badge, label: 'Position', value: (visitor as any).position },
          { icon: Badge, label: 'Employee ID', value: (visitor as any).employee_id }
        ];
      case 'conference':
        return [
          { icon: Building, label: 'Organization', value: (visitor as any).organization },
          { icon: Badge, label: 'Position', value: (visitor as any).position },
          { icon: Badge, label: 'Session Access', value: (visitor as any).session_access }
        ];
      case 'organisateurs':
        return [
          { icon: Building, label: 'Organization', value: (visitor as any).organization },
          { icon: Badge, label: 'Position', value: (visitor as any).position },
          { icon: Badge, label: 'Access Level', value: (visitor as any).access_level }
        ];
      case 'vip':
        return [
          { icon: Building, label: 'Organization', value: (visitor as any).organization },
          { icon: Badge, label: 'Position', value: (visitor as any).position },
          { icon: Badge, label: 'Special Access', value: (visitor as any).special_access }
        ];
      case 'visitors':
      default:
        return [
          { icon: Badge, label: 'Profession', value: (visitor as any).profession },
          { icon: Building, label: 'Company', value: (visitor as any).company }
        ];
    }
  };
  return (
    <View style={styles.overlay}>
      <Animated.View 
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color="#6B7280" />
        </TouchableOpacity>

        <View style={[styles.header, isNewUser ? styles.newUserHeader : styles.existingUserHeader]}>
          <View style={[styles.avatar, isNewUser ? styles.newUserAvatar : styles.existingUserAvatar]}>
            <User size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>
            {isNewUser ? 'Unregistered QR Code' : 'Visitor Found!'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isNewUser ? 'QR Code not in database' : VISITOR_TYPES[visitor.visitor_type]}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!isNewUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scan Statistics</Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <BarChart3 size={20} color="#16A34A" />
                  <Text style={styles.statNumber}>{visitor.total_scans}</Text>
                  <Text style={styles.statLabel}>Total Scans</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Clock size={20} color="#EA580C" />
                  <Text style={styles.statNumber}>{visitor.today_scans}</Text>
                  <Text style={styles.statLabel}>Today</Text>
                </View>
              </View>

              {Object.keys(scanStats.byDate).length > 0 && (
                <View style={styles.dailyStats}>
                  <Text style={styles.dailyStatsTitle}>Daily Scan History</Text>
                  {Object.entries(scanStats.byDate)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .slice(0, 5)
                    .map(([date, count]) => (
                      <View key={date} style={styles.dailyStatRow}>
                        <Text style={styles.dailyStatDate}>
                          {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Text>
                        <Text style={styles.dailyStatCount}>{count} scans</Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visitor Information</Text>
            
            <View style={styles.infoRow}>
              <User size={18} color="#6B7280" />
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{visitor.full_name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.qrCode}>QR: {visitor.qr_code}</Text>
            </View>

            {visitor.email && (
              <View style={styles.infoRow}>
                <Mail size={18} color="#6B7280" />
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{visitor.email}</Text>
              </View>
            )}

            {visitor.phone && (
              <View style={styles.infoRow}>
                <Phone size={18} color="#6B7280" />
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{visitor.phone}</Text>
              </View>
            )}

            {!isNewUser && getVisitorSpecificInfo().map((info, index) => (
              info.value && (
                <View key={index} style={styles.infoRow}>
                  <info.icon size={18} color="#6B7280" />
                  <Text style={styles.infoLabel}>{info.label}:</Text>
                  <Text style={styles.infoValue}>{info.value}</Text>
                </View>
              )
            ))}
          </View>

          {!isNewUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Badge Status</Text>
              
              <View style={styles.badgeStatus}>
                <View style={[styles.statusIndicator, badgeDownloaded ? styles.downloadedStatus : styles.pendingStatus]}>
                  <Download size={20} color="#FFFFFF" />
                  <Text style={styles.statusText}>
                    {badgeDownloaded ? 'Badge Downloaded' : 'Badge Pending'}
                  </Text>
                </View>
              </View>

              {visitor.created_at && (
                <View style={styles.infoRow}>
                  <Calendar size={18} color="#6B7280" />
                  <Text style={styles.infoLabel}>Registered:</Text>
                  <Text style={styles.infoValue}>{formatDate(visitor.created_at)}</Text>
                </View>
              )}
            </View>
          )}

          {isNewUser && (
            <View style={styles.section}>
              <View style={styles.newUserPrompt}>
                <Text style={styles.newUserText}>
                  This QR code is not registered in any visitor database. Please verify the QR code or register the visitor through the admin panel.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          {!isNewUser && !badgeDownloaded && (
            <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadBadge}>
              <Download size={20} color="#FFFFFF" />
              <Text style={styles.downloadButtonText}>Mark Badge Downloaded</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.continueButton} onPress={onClose}>
            <Text style={styles.continueButtonText}>
              {isNewUser ? 'Continue Scanning' : 'Scan Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: width - 40,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  existingUserHeader: {
    backgroundColor: '#16A34A',
  },
  newUserHeader: {
    backgroundColor: '#EA580C',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  existingUserAvatar: {
    backgroundColor: '#15803D',
  },
  newUserAvatar: {
    backgroundColor: '#C2410C',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  dailyStats: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dailyStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  dailyStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dailyStatDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  dailyStatCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    minWidth: 60,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  qrCode: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
    flex: 1,
  },
  badgeStatus: {
    marginBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  downloadedStatus: {
    backgroundColor: '#16A34A',
  },
  pendingStatus: {
    backgroundColor: '#EA580C',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  newUserPrompt: {
    backgroundColor: '#FED7AA',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EA580C',
  },
  newUserText: {
    fontSize: 14,
    color: '#9A3412',
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 24,
    paddingTop: 0,
    gap: 12,
  },
  downloadButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#EA580C',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});