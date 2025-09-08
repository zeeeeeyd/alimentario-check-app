import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Animated } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase, VISITOR_TYPES, VisitorType } from '@/lib/supabase';
import { Calendar, TrendingUp, Users, Eye, Building, Newspaper, Crown, UserCheck, ChevronDown } from 'lucide-react-native';

type DailyStats = {
  date: string;
  visitors: number;
  professional_visitors: number;
  press: number;
  exhibitors: number;
  staff: number;
  conference: number;
  organisateurs: number;
  vip: number;
  total: number;
};

export default function RecapScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(false);

  const didCancelRef = React.useRef(false);

  React.useEffect(() => {
    return () => {
      didCancelRef.current = true;
    };
  }, []);

  useEffect(() => {
    fetchDailyStats();
  }, [selectedDate]);

  const fetchDailyStats = async () => {
    if (!didCancelRef.current) {
      setLoading(true);
    }

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      
      const stats: DailyStats = {
        date: dateString,
        visitors: 0,
        professional_visitors: 0,
        press: 0,
        exhibitors: 0,
        staff: 0,
        conference: 0,
        organisateurs: 0,
        vip: 0,
        total: 0,
      };

      // Get scan counts for each visitor type
      const visitorTypes: VisitorType[] = [
        'visitors',
        'professional_visitors',
        'press',
        'exhibitors',
        'staff',
        'conference',
        'organisateurs',
        'vip'
      ];

      for (const visitorType of visitorTypes) {
        try {
          const { data, error } = await supabase
            .from('visitor_scans')
            .select('*', { count: 'exact' })
            .eq('visitor_type', visitorType)
            .eq('scan_date', dateString);

          if (!error && data) {
            stats[visitorType] = data.length;
            stats.total += data.length;
          }
        } catch (error) {
          console.error(`Error fetching ${visitorType} stats:`, error);
        }
      }

      if (!didCancelRef.current) {
        setDailyStats(stats);
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    } finally {
      if (!didCancelRef.current) {
        setLoading(false);
      }
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date && !didCancelRef.current) {
      setSelectedDate(date);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getVisitorTypeIcon = (type: VisitorType) => {
    switch (type) {
      case 'visitors':
        return Users;
      case 'professional_visitors':
        return UserCheck;
      case 'press':
        return Newspaper;
      case 'exhibitors':
        return Building;
      case 'staff':
        return UserCheck;
      case 'conference':
        return Users;
      case 'organisateurs':
        return Crown;
      case 'vip':
        return Crown;
      default:
        return Users;
    }
  };

  const getVisitorTypeColor = (type: VisitorType) => {
    switch (type) {
      case 'visitors':
        return '#16A34A';
      case 'professional_visitors':
        return '#EA580C';
      case 'press':
        return '#7C3AED';
      case 'exhibitors':
        return '#DC2626';
      case 'staff':
        return '#059669';
      case 'conference':
        return '#0891B2';
      case 'organisateurs':
        return '#C2410C';
      case 'vip':
        return '#BE185D';
      default:
        return '#6B7280';
    }
  };

  const SkeletonLoader = () => {
    const animatedValue = new Animated.Value(0);

    React.useEffect(() => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(animate);
      };
      animate();
    }, []);

    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Skeleton Total Card */}
        <Animated.View style={[styles.totalCard, { opacity }]}>
          <View style={styles.totalCardHeader}>
            <View style={styles.skeletonIcon} />
            <View style={styles.totalCardContent}>
              <View style={styles.skeletonTotalNumber} />
              <View style={styles.skeletonTotalLabel} />
            </View>
          </View>
          <View style={styles.skeletonDate} />
        </Animated.View>

        {/* Skeleton Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.skeletonSectionTitle} />
          
          <View style={styles.statsGrid}>
            {Array.from({ length: 8 }).map((_, index) => (
              <Animated.View key={index} style={[styles.statCard, { opacity }]}>
                <View style={styles.skeletonStatIcon} />
                <View style={styles.skeletonStatNumber} />
                <View style={styles.skeletonStatLabel} />
              </Animated.View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Daily Recap</Text>
          <Text style={styles.headerSubtitle}>View scan statistics by date</Text>
        </View>

        {/* Date Picker Section */}
        <View style={styles.dateSection}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color="#16A34A" />
            <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
            <ChevronDown size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <SkeletonLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Recap</Text>
        <Text style={styles.headerSubtitle}>View scan statistics by date</Text>
      </View>

      {/* Date Picker Section */}
      <View style={styles.dateSection}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Calendar size={20} color="#16A34A" />
          <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
          <ChevronDown size={20} color="#6B7280" />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Total Scans Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalCardHeader}>
            <TrendingUp size={32} color="#16A34A" />
            <View style={styles.totalCardContent}>
              <Text style={styles.totalNumber}>{dailyStats?.total || 0}</Text>
              <Text style={styles.totalLabel}>Total Scans</Text>
            </View>
          </View>
          <Text style={styles.totalDate}>
            {selectedDate.toDateString() === new Date().toDateString() 
              ? 'Today' 
              : formatDate(selectedDate)}
          </Text>
        </View>

        {/* Visitor Type Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Scans by Visitor Type</Text>
          
          <View style={styles.statsGrid}>
            {Object.entries(VISITOR_TYPES).map(([type, label]) => {
              const visitorType = type as VisitorType;
              const count = dailyStats?.[visitorType] || 0;
              const IconComponent = getVisitorTypeIcon(visitorType);
              const color = getVisitorTypeColor(visitorType);

              return (
                <View key={type} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
                    <IconComponent size={24} color={color} />
                  </View>
                  <Text style={styles.statNumber}>{count}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Summary Section */}
        {dailyStats && dailyStats.total > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Summary</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Eye size={16} color="#6B7280" />
                <Text style={styles.summaryText}>
                  Most active visitor type: {' '}
                  <Text style={styles.summaryHighlight}>
                    {Object.entries(dailyStats)
                      .filter(([key]) => key !== 'date' && key !== 'total')
                      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] 
                      ? VISITOR_TYPES[Object.entries(dailyStats)
                          .filter(([key]) => key !== 'date' && key !== 'total')
                          .sort(([,a], [,b]) => (b as number) - (a as number))[0][0] as VisitorType]
                      : 'None'}
                  </Text>
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <TrendingUp size={16} color="#6B7280" />
                <Text style={styles.summaryText}>
                  Professional visitors: {' '}
                  <Text style={styles.summaryHighlight}>
                    {((dailyStats.professional_visitors / dailyStats.total) * 100).toFixed(1)}%
                  </Text>
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Users size={16} color="#6B7280" />
                <Text style={styles.summaryText}>
                  General visitors: {' '}
                  <Text style={styles.summaryHighlight}>
                    {((dailyStats.visitors / dailyStats.total) * 100).toFixed(1)}%
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        {dailyStats && dailyStats.total === 0 && (
          <View style={styles.emptyState}>
            <Calendar size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No scans recorded</Text>
            <Text style={styles.emptyText}>
              No visitor scans were recorded on {formatDate(selectedDate)}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  dateSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateButton: {
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
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  totalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalCardContent: {
    marginLeft: 16,
    flex: 1,
  },
  totalNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#16A34A',
  },
  totalLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  totalDate: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: '45%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  summaryHighlight: {
    fontWeight: '600',
    color: '#16A34A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Skeleton styles
  skeletonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  skeletonTotalNumber: {
    width: 80,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  skeletonTotalLabel: {
    width: 100,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  skeletonDate: {
    width: 120,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  skeletonSectionTitle: {
    width: 180,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  skeletonStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  skeletonStatNumber: {
    width: 40,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    marginBottom: 4,
  },
  skeletonStatLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
});