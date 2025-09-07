import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { supabase, VisitorType, VISITOR_TYPES, AnyVisitor } from '@/lib/supabase';
import { Calendar, Clock, Users, TrendingUp, Filter, ChevronDown, X } from 'lucide-react-native';

type VisitorScan = {
  id: string;
  full_name: string;
  email: string;
  visitor_type: VisitorType;
  qr_code: string;
  badge_downloaded: boolean;
  date: string;
  scanned_at: string;
  scan_count?: number;
};

export default function HistoryScreen() {
  const [recentScans, setRecentScans] = useState<VisitorScan[]>([]);
  const [filteredScans, setFilteredScans] = useState<VisitorScan[]>([]);
  const [stats, setStats] = useState({
    totalVisitors: 0,
    todayScans: 0,
    badgesDownloaded: 0,
    totalScans: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<VisitorType | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    fetchVisitorStats();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [selectedFilter, recentScans]);

  const applyFilter = () => {
    if (selectedFilter === 'all') {
      setFilteredScans(recentScans);
    } else {
      setFilteredScans(recentScans.filter(scan => scan.visitor_type === selectedFilter));
    }
  };

  const fetchVisitorStats = async () => {
    try {
      const tables: VisitorType[] = [
        'visitors',
        'professional_visitors', 
        'press',
        'exhibitors',
        'staff',
        'conference',
        'organisateurs',
        'vip'
      ];

      let allVisitors: VisitorScan[] = [];
      let totalCount = 0;
      let badgeCount = 0;
      let totalScansCount = 0;

      for (const table of tables) {
        try {
          const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(20);

          if (data && !error) {
            totalCount += count || 0;
            badgeCount += data.filter(v => v.badge_downloaded).length;
            
            // Get scan counts for each visitor
            for (const visitor of data) {
              const { data: scanData } = await supabase
                .from('visitor_scans')
                .select('*', { count: 'exact' })
                .eq('visitor_id', visitor.id)
                .eq('visitor_type', table);
              
              totalScansCount += scanData?.length || 0;
            }
            
            const visitorsWithType = data.map(visitor => ({
              ...visitor,
              visitor_type: table,
              date: new Date(visitor.created_at).toDateString(),
              scanned_at: visitor.created_at,
            }));
            
            allVisitors.push(...visitorsWithType);
          }
        } catch (error) {
          console.error(`Error fetching ${table}:`, error);
        }
      }

      // Sort by creation date
      allVisitors.sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());
      
      // Calculate today's registrations
      const today = new Date().toDateString();
      const todayCount = allVisitors.filter(v => v.date === today).length;
      
      setRecentScans(allVisitors.slice(0, 50));
      setStats({
        totalVisitors: totalCount,
        todayScans: todayCount,
        badgesDownloaded: badgeCount,
        totalScans: totalScansCount,
      });
    } catch (error) {
      console.error('Error fetching visitor stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVisitorStats();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFilterLabel = () => {
    if (selectedFilter === 'all') return 'All Visitors';
    return VISITOR_TYPES[selectedFilter];
  };

  const renderVisitorItem = ({ item: visitor }: { item: VisitorScan }) => (
    <View style={styles.visitorItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{visitor.full_name}</Text>
        <Text style={styles.userEmail}>{visitor.email}</Text>
        <Text style={styles.visitorType}>{VISITOR_TYPES[visitor.visitor_type]}</Text>
      </View>
      <View style={styles.visitorStats}>
        <View style={styles.statRow}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.statText}>
            {formatTime(visitor.scanned_at)}
          </Text>
        </View>
        <View style={[styles.badgeStatus, visitor.badge_downloaded ? styles.downloaded : styles.pending]}>
          <Text style={styles.badgeStatusText}>
            {visitor.badge_downloaded ? 'Downloaded' : 'Pending'}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading visitor data...</Text>
      </View>
    );
  }

  if (filteredScans.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Calendar size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>
          {selectedFilter === 'all' ? 'No visitors yet' : `No ${getFilterLabel().toLowerCase()} found`}
        </Text>
        <Text style={styles.emptyText}>
          {selectedFilter === 'all' ? 'Registered visitors will appear here' : 'Try selecting a different filter'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Visitor Dashboard</Text>
        
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Users size={20} color="#16A34A" />
            <Text style={styles.statNumber}>{stats.totalVisitors}</Text>
            <Text style={styles.statLabel}>Total Visitors</Text>
          </View>
          
          <View style={styles.statCard}>
            <TrendingUp size={20} color="#EA580C" />
            <Text style={styles.statNumber}>{stats.todayScans}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          
          <View style={styles.statCard}>
            <Calendar size={20} color="#16A34A" />
            <Text style={styles.statNumber}>{stats.badgesDownloaded}</Text>
            <Text style={styles.statLabel}>Downloaded</Text>
          </View>
          
          <View style={styles.statCard}>
            <Clock size={20} color="#EA580C" />
            <Text style={styles.statNumber}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.filterSection}>
        <Text style={styles.sectionTitle}>Recent Registrations</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={16} color="#16A34A" />
          <Text style={styles.filterButtonText}>{getFilterLabel()}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredScans}
        keyExtractor={(item) => `${item.visitor_type}-${item.id}`}
        renderItem={renderVisitorItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Visitor Type</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFilterModal(false)}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.filterList}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedFilter === 'all' && styles.selectedFilterOption
                ]}
                onPress={() => {
                  setSelectedFilter('all');
                  setShowFilterModal(false);
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedFilter === 'all' && styles.selectedFilterOptionText
                ]}>
                  All Visitors
                </Text>
              </TouchableOpacity>
              
              {Object.entries(VISITOR_TYPES).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterOption,
                    selectedFilter === key && styles.selectedFilterOption
                  ]}
                  onPress={() => {
                    setSelectedFilter(key as VisitorType);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilter === key && styles.selectedFilterOptionText
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  visitorItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  visitorType: {
    fontSize: 12,
    color: '#16A34A',
    marginTop: 2,
    fontWeight: '500',
  },
  visitorStats: {
    alignItems: 'flex-end',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  badgeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  downloaded: {
    backgroundColor: '#DCFCE7',
  },
  pending: {
    backgroundColor: '#FED7AA',
  },
  badgeStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedFilterOption: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  selectedFilterOptionText: {
    color: '#FFFFFF',
  },
});