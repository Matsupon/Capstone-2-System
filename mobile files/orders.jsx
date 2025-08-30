import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Header from '../../components/Header';
import api from '../../utils/api';

export default function AppointmentsPage() {
  const [expandedRecent, setExpandedRecent] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState({
    first: false,
    second: false,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Next appointment (same logic as Home/index.jsx)
  const [nextAppointment, setNextAppointment] = useState(null);

  // Latest order (same source as Home/index.jsx)
  const [latestOrder, setLatestOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  
  // Finished orders for history section
  const [finishedOrders, setFinishedOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const toggleRecent = () => {
    setExpandedRecent(!expandedRecent);
  };

  const toggleHistory = (key) => {
    setExpandedHistory((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleImagePress = (imageSource) => {
    setSelectedImage(imageSource);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  // helpers copied to match Home/index.jsx behavior
  const formatDateTime12 = (iso) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Invalid date';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${mm}/${dd}/${yyyy} ${time}`;
  };

  const parseSizesToText = (sizes) => {
    try {
      let obj = sizes;
      if (!obj) return '';
      if (typeof obj === 'string') {
        obj = JSON.parse(obj);
      }
      if (Array.isArray(obj)) {
        return obj.join(', ');
      }
      if (obj && typeof obj === 'object') {
        return Object.entries(obj)
          .filter(([, qty]) => Number(qty) > 0)
          .map(([size, qty]) => `${size} - ${qty} pcs.`)
          .join('\n');
      }
      return '';
    } catch (_) {
      return '';
    }
  };

  const loadNextAppointment = useCallback(async () => {
    try {
      const res = await api.get('/appointments/next-appointment');
      const data = res.data;
      if (data?.appointment_date && data?.appointment_time) {
        const iso = `${data.appointment_date}T${data.appointment_time}`;
        const dateTime = new Date(iso);
        if (!isNaN(dateTime.getTime())) {
          setNextAppointment(formatDateTime12(dateTime));
        } else {
          setNextAppointment(null);
        }
      } else {
        setNextAppointment(null);
      }
    } catch (err) {
      setNextAppointment(null);
    }
  }, []);

  const loadLatestOrder = useCallback(async () => {
    try {
      setOrderLoading(true);
      const res = await api.get('/me/orders/latest');
      if (res.data?.success) {
        setLatestOrder(res.data.data || null);
      }
    } catch (e) {
      // noop
    } finally {
      setOrderLoading(false);
    }
  }, []);

  const loadFinishedOrders = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/me/orders/history');
      if (res.data?.success) {
        setFinishedOrders(res.data.data || []);
      }
    } catch (e) {
      // noop
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNextAppointment();
    loadLatestOrder();
    loadFinishedOrders();
  }, [loadNextAppointment, loadLatestOrder, loadFinishedOrders]);

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed':
        return '#4caf50';
      case 'Ready to Check':
        return '#e91e63';
      case 'Pending':
      default:
        return '#FFA500';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <Header userName="Dianne" />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 50 }}>
        <Text style={styles.pageTitle}>My Orders</Text>

        {/* Reminders Section */}
        <Text style={styles.sectionTitle}>Reminders</Text>
        <View style={styles.reminderCard}>
          <View style={[styles.indicator, styles.indicatorGreen]} />
          <MaterialIcons name="access-time" size={24} color="#16A34A" style={styles.icon} />
          <View>
            <Text style={styles.cardTitle}>Next Appointment</Text>
            <Text style={styles.cardDate}>{nextAppointment ? nextAppointment : 'No appointment set for now'}</Text>
          </View>
        </View>

        {/* Recent Section */}
        <Text style={styles.sectionTitle}>Recent</Text>
        <View style={styles.appointmentCard}>
          <View style={[styles.indicator, {backgroundColor: getStatusColor(latestOrder?.status || 'Pending')}]} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>
                {latestOrder ? `Order: ${latestOrder?.appointment?.service_type || 'N/A'}` : 'No recent orders for now'}
              </Text>
              {latestOrder && (
                <TouchableOpacity onPress={toggleRecent} style={styles.statusContainer}>
                  {latestOrder?.status ? (
                    <Text
                      style={[
                        styles.statusText,
                        latestOrder?.status === 'Completed'
                          ? styles.statusCompleted
                          : latestOrder?.status === 'Ready to Check'
                          ? styles.statusReadyToCheck
                          : styles.statusPending,
                      ]}
                    >
                      {latestOrder?.status}
                    </Text>
                  ) : (
                    <Text style={[styles.statusText, styles.statusPending]}>Pending</Text>
                  )}
                  <MaterialIcons
                    name={expandedRecent ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={24}
                    color={getStatusColor(latestOrder?.status || 'Pending')}
                  />
                </TouchableOpacity>
              )}
            </View>
            {expandedRecent && latestOrder && (
              <View style={styles.dropdownContent}>
                <Text style={styles.dropdownTitle}>Order Details:</Text>
                <Text style={styles.dropdownText}>{`• Service: ${latestOrder?.appointment?.service_type || 'N/A'}`}</Text>
                <Text style={styles.dropdownText}>{`• Phone Number: ${latestOrder?.appointment?.user?.phone || 'N/A'}`}</Text>
                <Text style={styles.dropdownText}>{`• Size: ${parseSizesToText(latestOrder?.appointment?.sizes) || 'N/A'}`}</Text>
                <Text style={styles.dropdownText}>{`• Quantity: ${latestOrder?.appointment?.total_quantity ?? 'N/A'} pcs.`}</Text>
                <Text style={styles.dropdownText}>{`• Due Date: ${
  latestOrder?.appointment?.preferred_due_date
    ? new Date(latestOrder.appointment.preferred_due_date).toLocaleDateString()
    : 'N/A'
}`}</Text>
                <Text style={styles.dropdownText}>{`• Notes: ${latestOrder?.appointment?.notes || 'N/A'}`}</Text>
                <Text style={styles.dropdownText}>• Design Image:</Text>
                {latestOrder?.appointment?.design_image ? (
                  <TouchableOpacity onPress={() => handleImagePress({ uri: latestOrder.appointment.design_image })}>
                    <Image source={{ uri: latestOrder.appointment.design_image }} style={styles.image} />
                  </TouchableOpacity>
                ) : null}
                <Text style={styles.dropdownText}>• Gcash Downpayment:</Text>
                {latestOrder?.appointment?.gcash_proof ? (
                  <TouchableOpacity onPress={() => handleImagePress({ uri: latestOrder.appointment.gcash_proof })}>
                    <Image source={{ uri: latestOrder.appointment.gcash_proof }} style={styles.image} />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        </View>

        {/* History Section */}
        <Text style={styles.sectionTitle}>History</Text>

        {finishedOrders.length > 0 ? (
          finishedOrders.map((order, index) => (
            <View key={order.id} style={styles.appointmentCard}>
              <View style={[styles.indicator, styles.indicatorCompleted]} />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardDate}>
                    {`Order: ${order?.appointment?.service_type || 'N/A'}`}
                  </Text>
                  <TouchableOpacity onPress={() => toggleHistory(index.toString())} style={styles.statusContainer}>
                    <Text style={[styles.statusText, styles.statusCompleted]}>Completed</Text>
                    <MaterialIcons
                      name={expandedHistory[index.toString()] ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={24}
                      color="#4caf50"
                    />
                  </TouchableOpacity>
                </View>
                {expandedHistory[index.toString()] && (
                  <View style={styles.dropdownContent}>
                    <Text style={styles.dropdownTitle}>Order Details:</Text>
                    <Text style={styles.dropdownText}>{`• Service: ${order?.appointment?.service_type || 'N/A'}`}</Text>
                    <Text style={styles.dropdownText}>{`• Phone Number: ${order?.appointment?.user?.phone || 'N/A'}`}</Text>
                    <Text style={styles.dropdownText}>{`• Size: ${parseSizesToText(order?.appointment?.sizes) || 'N/A'}`}</Text>
                    <Text style={styles.dropdownText}>{`• Quantity: ${order?.appointment?.total_quantity ?? 'N/A'} pcs.`}</Text>
                    <Text style={styles.dropdownText}>{`• Due Date: ${
                      order?.appointment?.preferred_due_date
                        ? new Date(order.appointment.preferred_due_date).toLocaleDateString()
                        : 'N/A'
                    }`}</Text>
                    <Text style={styles.dropdownText}>{`• Notes: ${order?.appointment?.notes || 'N/A'}`}</Text>
                    <Text style={styles.dropdownText}>• Design Image:</Text>
                    {order?.appointment?.design_image ? (
                      <TouchableOpacity onPress={() => handleImagePress({ uri: order.appointment.design_image })}>
                        <Image source={{ uri: order.appointment.design_image }} style={styles.image} />
                      </TouchableOpacity>
                    ) : null}
                    <Text style={styles.dropdownText}>• Gcash Downpayment:</Text>
                    {order?.appointment?.gcash_proof ? (
                      <TouchableOpacity onPress={() => handleImagePress({ uri: order.appointment.gcash_proof })}>
                        <Image source={{ uri: order.appointment.gcash_proof }} style={styles.image} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.appointmentCard}>
            <View style={[styles.indicator, styles.indicatorCompleted]} />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>No finished orders yet</Text>
                <Text style={[styles.statusText, styles.statusCompleted]}>Completed</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Image Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
            <MaterialIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={selectedImage}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  statusPending: {
    color: '#FFA500', // Orange for Pending
  },
  statusReadyToCheck: {
    color: '#e91e63', // Pink for Ready to Check
  },
  statusCompleted: {
    color: '#4caf50', // Green for Completed
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: '#e0f4ff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 10,
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  indicator: {
    width: 4,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },
  indicatorGreen: {
    backgroundColor: '#16A34A',
  },
  indicatorOrange: {
    backgroundColor: '#FFA500',
  },
  indicatorBlue: {
    backgroundColor: '#4682B4',
  },
  icon: {
    marginHorizontal: 15,
  },
  cardContent: {
    flex: 1,
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  cardDate: {
    fontSize: 14,
    color: '#000',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5,
  },
  statusOngoing: {
    color: '#FFA500',
  },
  statusCompleted: {
    color: '#16A34A',
  },
  dropdownContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 5,
  },
  dropdownText: {
    fontSize: 14,
    color: '#687076',
    marginBottom: 3,
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
  },


  // Modal Styles
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '90%',
    height: '70%',
    borderRadius: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
});
