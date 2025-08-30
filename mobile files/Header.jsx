import { MaterialIcons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { Image, StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal } from 'react-native';
import api from '../../utils/api';

export default function Header({ userName = 'User' }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data?.success) {
        const list = res.data.data || [];
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setNotifications(list);
      }
    } catch (e) {
      console.log('Failed to load notifications', e?.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const formatMonthDay = (iso) => {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}`;
  };

  const formatTime12 = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getNotificationTitle = (notification) => {
    if (notification.type === 'ready_to_check') {
      return 'Your order is now ready to check';
    } else if (notification.type === 'order_completed') {
      return 'Your order is now completed';
    }
    return notification.title || 'Notification';
  };

  const getNotificationBody = (notification) => {
    if (notification.type === 'ready_to_check') {
      return 'Your order is now ready to check. Please visit us to review your order.';
    } else if (notification.type === 'order_completed') {
      const amount = notification.data?.total_amount 
        ? `Please prepare ₱${Number(notification.data.total_amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} to get your order.`
        : '';
      return `Your order is now completed. ${amount}`.trim();
    }
    return notification.body || '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
          />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Jun Tailoring</Text>
            <Text style={styles.subtitle}>Appointment System</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.profileContainer}
          onPress={() => setShowNotifications(!showNotifications)}
        >
          <MaterialIcons name="notifications" size={40} color="#4682B4" />
          {notifications.length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{notifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notification Dropdown */}
      {showNotifications && (
        <View style={styles.notificationDropdown}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setShowNotifications(false)}>
              <MaterialIcons name="close" size={20} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={true}>
            {loading ? (
              <Text style={styles.noNotificationsText}>Loading notifications...</Text>
            ) : notifications.length === 0 ? (
              <Text style={styles.noNotificationsText}>No notifications yet</Text>
            ) : (
              notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <Text style={styles.notificationDate}>{formatMonthDay(notification.created_at)}</Text>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{getNotificationTitle(notification)}</Text>
                    <Text style={styles.notificationBody}>{getNotificationBody(notification)}</Text>
                    <Text style={styles.notificationTime}>{formatTime12(notification.created_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 110,
    position: 'relative',
    backgroundColor: '#e0f4ff',
    paddingTop: 40,
  },
  content: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#e0f4ff', 
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  titleContainer: {
    marginLeft: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  profileContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e91e63',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationDropdown: {
    position: 'absolute',
    top: 110,
    right: 20,
    width: 300,
    maxHeight: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  notificationList: {
    maxHeight: 350,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notificationDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginRight: 15,
    width: 45,
  },
  notificationContent: {
    flex: 1,
  },
  notificationBody: {
    fontSize: 14,
    color: '#687076',
    marginTop: 2,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 12,
    color: '#687076',
    marginTop: 5,
  },
  noNotificationsText: {
    padding: 20,
    textAlign: 'center',
    color: '#687076',
    fontSize: 14,
  },
}); 