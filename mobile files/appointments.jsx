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

  useEffect(() => {
    loadNextAppointment();
    loadLatestOrder();
  }, [loadNextAppointment, loadLatestOrder]);

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <Header userName="Dianne" />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 50 }}>
        <Text style={styles.pageTitle}>My Appointments</Text>

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
          <View style={[styles.indicator, styles.indicatorOrange]} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>
                {latestOrder ? `Order: ${latestOrder?.appointment?.service_type || 'N/A'}` : 'No recent order'}
              </Text>
              <TouchableOpacity onPress={toggleRecent} style={styles.statusContainer}>
                {latestOrder?.status ? (
                  <Text
                    style={[
                      styles.statusText,
                      latestOrder?.status === 'Completed'
                        ? styles.statusCompleted
                        : latestOrder?.status === 'Ready to Check'
                        ? styles.statusOngoing
                        : styles.statusOngoing,
                    ]}
                  >
                    {latestOrder?.status}
                  </Text>
                ) : (
                  <Text style={[styles.statusText, styles.statusOngoing]}>Pending</Text>
                )}
                <MaterialIcons
                  name={expandedRecent ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#FFA500"
                />
              </TouchableOpacity>
            </View>
            {expandedRecent && latestOrder && (
              <View style={styles.dropdownContent}>
                <Text style={styles.dropdownTitle}>Order Details:</Text>
                <Text style={styles.dropdownText}>{`• Service: ${latestOrder?.appointment?.service_type || 'N/A'}`}</Text>
                <Text style={styles.dropdownText}>{`• Phone Number: ${latestOrder?.appointment?.user?.phone || 'N/A'}`}</Text>
                <Text style={styles.dropdownText}>{`• Size: ${parseSizesToText(latestOrder?.appointment?.sizes) || 'N/A'}`}</Text>
                <Text style={styles.dropdownText}>{`• Quantity: ${latestOrder?.appointment?.total_quantity ?? 'N/A'} pcs.`}</Text>
                <Text style={styles.dropdownText}>{`• Due Date: ${(() => {
                  const status = latestOrder?.status;
                  const pref = latestOrder?.appointment?.preferred_due_date;
                  const sched = latestOrder?.scheduled_at;
                  const apptDate = latestOrder?.appointment?.appointment_date;
                  const dateSrc = status === 'Ready to Check' && sched ? sched : pref || apptDate;
                  return dateSrc ? new Date(dateSrc).toLocaleDateString() : 'N/A';
                })()}`}</Text>
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

        {/* First History */}
        <View style={styles.appointmentCard}>
          <View style={[styles.indicator, styles.indicatorBlue]} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>April 5, 2025 - 10:00 AM</Text>
              <TouchableOpacity onPress={() => toggleHistory('first')} style={styles.statusContainer}>
                <Text style={[styles.statusText, styles.statusCompleted]}>Completed</Text>
                <MaterialIcons
                  name={expandedHistory.first ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#16A34A"
                />
              </TouchableOpacity>
            </View>
            {expandedHistory.first && (
              <View style={styles.dropdownContent}>
                <Text style={styles.dropdownTitle}>Order Details:</Text>
                <Text style={styles.dropdownText}>• Service: Customize Jersey</Text>
                <Text style={styles.dropdownText}>• Phone Number: +63 912 345 6789</Text>
                <Text style={styles.dropdownText}>• Size: Small - 2 pcs., Medium - 3 pcs.</Text>
                <Text style={styles.dropdownText}>• Quantity: 5 pcs.</Text>
                <Text style={styles.dropdownText}>• Due Date: May 30, 2025</Text>
                <Text style={styles.dropdownText}>• Notes: Add red stripes on sleeves</Text>
                <Text style={styles.dropdownText}>• Design Image:</Text>
                <TouchableOpacity onPress={() => handleImagePress(require('../../assets/images/jersey.jpg'))}>
                  <Image source={require('../../assets/images/jersey.jpg')} style={styles.image} />
                </TouchableOpacity>
                <Text style={styles.dropdownText}>• Gcash Downpayment:</Text>
                <TouchableOpacity onPress={() => handleImagePress(require('../../assets/images/gcash.png'))}>
                  <Image source={require('../../assets/images/gcash.png')} style={styles.image} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Second History */}
        <View style={styles.appointmentCard}>
          <View style={[styles.indicator, styles.indicatorBlue]} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>March 5, 2025 - 10:00 AM</Text>
              <TouchableOpacity onPress={() => toggleHistory('second')} style={styles.statusContainer}>
                <Text style={[styles.statusText, styles.statusCompleted]}>Completed</Text>
                <MaterialIcons
                  name={expandedHistory.second ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#16A34A"
                />
              </TouchableOpacity>
            </View>
            {expandedHistory.second && (
              <View style={styles.dropdownContent}>
                <Text style={styles.dropdownTitle}>Order Details:</Text>
                <Text style={styles.dropdownText}>• Service: Customize Jersey</Text>
                <Text style={styles.dropdownText}>• Phone Number: +63 912 345 6789</Text>
                <Text style={styles.dropdownText}>• Size: Small - 2 pcs., Medium - 3 pcs.</Text>
                <Text style={styles.dropdownText}>• Quantity: 5 pcs.</Text>
                <Text style={styles.dropdownText}>• Due Date: May 30, 2025</Text>
                <Text style={styles.dropdownText}>• Notes: Add red stripes on sleeves</Text>
                <Text style={styles.dropdownText}>• Design Image:</Text>
                <TouchableOpacity onPress={() => handleImagePress(require('../../assets/images/jersey.jpg'))}>
                  <Image source={require('../../assets/images/jersey.jpg')} style={styles.image} />
                </TouchableOpacity>
                <Text style={styles.dropdownText}>• Gcash Downpayment:</Text>
                <TouchableOpacity onPress={() => handleImagePress(require('../../assets/images/gcash.png'))}>
                  <Image source={require('../../assets/images/gcash.png')} style={styles.image} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
