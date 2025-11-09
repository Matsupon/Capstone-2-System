import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BookAppointment from '../../components/BookAppointment';
import Header from '../../components/Header';
import api from '../../utils/api';

export default function HomePage() {
  const [userFirstName, setUserFirstName] = useState('User');
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [latestOrder, setLatestOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [details, setDetails] = useState(null);
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const headerRefreshFn = useRef(null);
  // Feedback prompt state
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [finishedVisible, setFinishedVisible] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(null); // { order_id, service_type, completed_at }
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [restrictionWarningVisible, setRestrictionWarningVisible] = useState(false);

  const loadCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/user');
      const fullName = res?.data?.user?.name || '';
      const first = fullName.trim().split(/\s+/)[0] || 'User';
      setUserFirstName(first);
    } catch (_) {
      setUserFirstName('User');
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        const list = (res.data.data || []);
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setNotifications(list);
      }
    } catch (e) {
      if (e?.response?.status === 401) {
        // Token expired or invalid - redirect to login
        try {
          await AsyncStorage.removeItem('authToken');
          router.replace('/auth/login');
        } catch (storageError) {
          console.log('Error during logout:', storageError);
        }
      } else {
        console.log('Failed to load notifications', e?.message || e);
      }
    }
  }, [router]);

  const loadLatestOrder = useCallback(async () => {
    try {
      setOrderLoading(true);
      const res = await api.get('/me/orders/latest');
      if (res.data?.success) {
        setLatestOrder(res.data.data || null);
      }
    } catch (e) {
      // Only log if it's not a network error (network errors are expected if server is down)
      if (e.response) {
        console.log('Failed to load latest order', e?.response?.status, e?.message);
      } else if (e.code !== 'NETWORK_ERROR' && e.message !== 'Network Error') {
        console.log('Failed to load latest order', e?.message || e);
      }
      // Don't set latestOrder to null on error, keep previous value
    } finally {
      setOrderLoading(false);
    }
  }, []);

  // Check if there is a finished order without feedback
  const loadPendingFeedback = useCallback(async () => {
    try {
      const res = await api.get('/feedback/my-pending');
      if (res.data?.success && res.data.data) {
        setPendingFeedback(res.data.data);
        setFeedbackRating(0);
        setFeedbackComment('');
        // First show the congratulations modal, only then show feedback modal
        setFinishedVisible(true);
      } else {
        setPendingFeedback(null);
        setFeedbackVisible(false);
        setFinishedVisible(false);
      }
    } catch (e) {
      // silent
    }
  }, []);

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
          console.log("Invalid date from API:", iso);
          setNextAppointment(null);
        }
      } else {
        setNextAppointment(null);
      }
    } catch (err) {
      // Only log if it's not a 404 or network error
      if (err?.response?.status === 404) {
        // 404 is expected if no appointment exists
        setNextAppointment(null);
      } else if (err.response) {
        // Server responded with an error
        console.log('Error fetching appointment', err?.response?.status, err?.message);
        setNextAppointment(null);
      } else if (err.code !== 'NETWORK_ERROR' && err.message !== 'Network Error') {
        // Other errors (but not network errors)
        console.log('Error fetching appointment', err);
        setNextAppointment(null);
      }
      // Don't set to null on network errors, keep previous value if available
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadCurrentUser();
    loadLatestOrder();
    loadNextAppointment();
    // Also check for pending feedback (in case there is no active order)
    loadPendingFeedback();
    // load last seen timestamp for notifications
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('notifications_last_seen_at');
        if (saved) setLastSeenAt(saved);
      } catch (_) {}
    })();
  }, [loadNotifications, loadCurrentUser, loadLatestOrder, loadNextAppointment, loadPendingFeedback]);

  // Sync lastSeenAt with AsyncStorage changes (when Header marks notifications as seen)
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const saved = await AsyncStorage.getItem('notifications_last_seen_at');
        if (saved !== lastSeenAt) {
          // lastSeenAt changed, update state to sync NEW badge
          setLastSeenAt(saved);
        }
      } catch (error) {
        // Silently fail - AsyncStorage errors are rare
      }
    }, 1000); // Check every 1 second for sync

    return () => clearInterval(syncInterval);
  }, [lastSeenAt]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadNotifications(), loadLatestOrder(), loadNextAppointment(), loadPendingFeedback()]);
    setRefreshing(false);
  }, [loadNotifications, loadLatestOrder, loadNextAppointment, loadPendingFeedback]);

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

  const formatDateTime12 = (iso) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Invalid date";  
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${mm}/${dd}/${yyyy} ${time}`;
  };

  const formatTo12Hour = (time24) => {
    const [hour, minute] = time24.split(':');
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${period}`;
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
        const minuteStr = minute < 10 ? `0${minute}` : `${minute}`;
        const time = `${hourStr}:${minuteStr}`;
        if (time !== '12:00' && time !== '12:30') {
          slots.push(time);
        }
      }
    }
    return slots;
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

  const openDetails = (n) => {
    if (n.type === 'appointment_booked') {
      setDetails({
        type: 'appointment_booked',
        title: 'You have successfully booked an appointment!',
        message: n.body || 'Please wait while the admin reviews your appointment request. Your order will be processed once it has been approved. In the meantime, you can check your submitted appointment at the "My Profile" page under the "My Appointments" section.',
      });
      setDetailsVisible(true);
      return;
    }

    if (n.type === 'ready_to_check') {
      setDetails({
        type: 'ready_to_check',
        title: 'Your order is now ready to check',
        scheduled_at: n.data?.scheduled_at || null,
      });
      setDetailsVisible(true);
      return;
    }

    if (n.type === 'order_finished') {
      setDetails({
        type: 'order_finished',
        title: 'Congratulations! Your order is now finished!',
        message: 'Please go to the \'My Orders\' page and under the \'Order History\' section to check your finished order!',
      });
      setDetailsVisible(true);
      return;
    }

    if (n.type === 'feedback_responded') {
      const title = 'Admin responded to your feedback';
      const body = n.body || n.data?.admin_response || (n.data?.admin_checked ? 'The admin has reviewed your feedback.' : '');
      setDetails({ type: 'feedback_responded', title, body });
      setDetailsVisible(true);
      return;
    }

    if (n.type === 'order_completed') {
      setDetails({
        type: 'order_completed',
        title: 'Your order is now completed',
        scheduled_at: n.data?.scheduled_at || null,
        amount: n.data?.total_amount != null ? Number(n.data.total_amount) : null,
      });
      setDetailsVisible(true);
      return;
    }

    if (n.type === 'order_details_updated') {
      setDetails({
        type: 'order_details_updated',
        title: 'You have successfully updated your Order Details!',
        message: 'Your order details have been successfully updated.',
      });
      setDetailsVisible(true);
      return;
    }

    if (n.type === 'order_cancelled') {
      setDetails({
        type: 'order_cancelled',
        title: 'You have successfully cancelled an order!',
        message: '',
      });
      setDetailsVisible(true);
      return;
    }

    setDetails({
      type: 'generic',
      title: n.title,
      body: n.body ?? '',
    });
    setDetailsVisible(true);
  };

  const renderActivityItem = (n) => {
    const isReadyToCheck = n.type === 'ready_to_check';
    const isOrderCompleted = n.type === 'order_completed';
    const isOrderFinished = n.type === 'order_finished';
    const isFeedbackResponded = n.type === 'feedback_responded';
    const isAppointmentRejected = n.type === 'appointment_rejected';
    const isAppointmentBooked = n.type === 'appointment_booked';
    const isOrderDetailsUpdated = n.type === 'order_details_updated';
    const isOrderCancelled = n.type === 'order_cancelled';
    const showViewMore = isReadyToCheck || isOrderCompleted || isAppointmentRejected || isFeedbackResponded || isOrderFinished || isAppointmentBooked || isOrderDetailsUpdated || isOrderCancelled;
    const title = isReadyToCheck
      ? 'Your order is now ready to check'
      : isOrderCompleted
      ? 'Your order is now completed'
      : isOrderFinished
      ? 'Your order is now finished'
      : isFeedbackResponded
      ? 'Admin responded to your feedback'
      : isAppointmentBooked
      ? 'You have successfully booked an appointment!'
      : isOrderDetailsUpdated
      ? 'You have successfully updated your Order Details!'
      : isOrderCancelled
      ? 'You have successfully cancelled an order!'
      : n.title;
    const isUnread = !lastSeenAt || new Date(n.created_at).getTime() > new Date(lastSeenAt).getTime();
    return (
      <View key={n.id} style={styles.activityItem}>
        {isUnread && (
          <View style={styles.newPill}>
            <Text style={styles.newPillText}>NEW</Text>
          </View>
        )}
        <Text style={styles.activityDate}>{formatMonthDay(n.created_at)}</Text>
        <View style={styles.activityContent}>
          <Text style={styles.activityText}>{title}</Text>
          {isAppointmentBooked && n.body && (
            <Text style={styles.activitySubtext}>{n.body}</Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.activityTime}>{formatTime12(n.created_at)}</Text>
            {showViewMore && (
              <TouchableOpacity onPress={() => openDetails(n)} style={{ marginLeft: 12 }}>
                <Text style={styles.viewMore}>View More</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <Header
        userName={userFirstName}
        onRef={(fn) => { headerRefreshFn.current = fn; }}
        onNotificationsViewed={async () => {
          try {
            const saved = await AsyncStorage.getItem('notifications_last_seen_at');
            if (saved) {
              setLastSeenAt(saved);
            } else {
              const now = new Date().toISOString();
              await AsyncStorage.setItem('notifications_last_seen_at', now);
              setLastSeenAt(now);
            }
          } catch (_) {}
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back, {userFirstName}!</Text>
          <Text style={styles.welcomeSubtext}>
            "We're tailoring your orders with care.{'\n'}Here's what's happening today."
          </Text>
        </View>

        {latestOrder && latestOrder.status !== 'Finished' ? (
          <View style={styles.orderCard}>
            <View style={styles.orderTitleContainer}>
              <Text style={styles.orderTitle}>
                <Text style={styles.boldText}>Current Order</Text>
                {latestOrder?.queue_number ? ` - Queue #${latestOrder.queue_number}` : ''}
              </Text>
            </View>
            <View style={styles.orderDetails}>
              <View style={styles.orderInfo}>
                <Text style={styles.itemText}>
                  {latestOrder?.appointment?.service_type || 'N/A'}
                </Text>
                <View style={styles.sizeDetails}>
                  <Text style={styles.sizeLabel}>Size:</Text>
                  <Text style={styles.sizeText}>
                    {parseSizesToText(latestOrder?.appointment?.sizes) || 'N/A'}
                  </Text>
                </View>
                <Text style={styles.itemDetail}>
                  {`Quantity: ${latestOrder?.appointment?.total_quantity ?? 'N/A'} pcs.`}
                </Text>
              </View>
              <View style={styles.dateSection}>
                <Text style={styles.dateLabel}>Due Date</Text>
                <Text style={styles.date}>
                  {(() => {
                    const status = latestOrder?.status;
                    const pref = latestOrder?.appointment?.preferred_due_date;
                    const sched = latestOrder?.scheduled_at;
                    const apptDate = latestOrder?.appointment?.appointment_date;
                    const dateSrc =
                      status === 'Ready to Check' && sched ? sched : pref || apptDate;
                    return dateSrc ? new Date(dateSrc).toLocaleDateString() : 'N/A';
                  })()}
                </Text>
              </View>
            </View>

            <View style={styles.orderProgressContainer}>
              <View style={styles.progressBar}>
                {['Pending', 'Ready to Check', 'Completed'].map((step, idx) => {
                  const status = latestOrder?.status || 'Pending';
                  const activeIdx =
                    status === 'Pending' ? 0 : status === 'Ready to Check' ? 1 : 2;
                  const isActive = idx === activeIdx;
                  
                  // Determine the color based on which step is active
                  let activeStyle = styles.stepCurrent; // default green
                  if (isActive) {
                    if (idx === 0) activeStyle = styles.stepOrange; // Pending
                    else if (idx === 1) activeStyle = styles.stepRed; // Ready to Check
                    else activeStyle = styles.stepCurrent; // Completed (green)
                  }
                  
                  return (
                    <View
                      key={step}
                      style={[
                        styles.progressStep,
                        isActive ? activeStyle : styles.stepDone,
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={styles.progressText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                Pending → Ready to Check → Completed
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.orderCard}>
            <Text style={styles.orderTitle}>
              <Text style={styles.boldText}>You have no orders yet</Text>
            </Text>
            <Text style={{ color: '#687076' }}>
              Press on the blue button at the bottom right to book an appointment!
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Announcements</Text>

        <View style={styles.announcementCard}>
          <View style={[styles.indicator, styles.indicatorGreen]} />
          <MaterialIcons
            name="access-time"
            size={24}
            color="#16A34A"
            style={styles.announcementIcon}
          />
          <View>
            <Text style={styles.announcementTitle}>Next Appointment</Text>
            <Text style={styles.announcementDate}>
              {latestOrder && latestOrder.status !== 'Finished' && nextAppointment 
                ? nextAppointment 
                : 'No recent appointment for now'}
            </Text>
          </View>
        </View>

        <View style={styles.announcementCard}>
          <View style={[styles.indicator, styles.indicatorYellow]} />
          <MaterialCommunityIcons
            name="file-document-outline"
            size={24}
            color="#FFA500"
            style={styles.announcementIcon}
          />
          <View>
            <Text style={styles.announcementTitle}>Order Status</Text>
            {latestOrder && latestOrder.status !== 'Finished' && latestOrder?.status ? (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      latestOrder?.status === 'Completed'
                        ? '#E8F5E9'
                        : latestOrder?.status === 'Ready to Check'
                        ? '#FFEBEE'
                        : '#FFF3E0',
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      latestOrder?.status === 'Completed'
                        ? '#4caf50'
                        : latestOrder?.status === 'Ready to Check'
                        ? '#e91e63'
                        : '#FFA500',
                    fontSize: 12,
                    fontWeight: '500',
                  }}
                >
                  {latestOrder?.status}
                </Text>
              </View>
            ) : (
              <Text style={styles.announcementDate}>No recent status for now</Text>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>

        <View style={styles.activityList}>
          {notifications.length === 0 || (latestOrder && latestOrder.status === 'Finished') ? (
            <Text style={{ color: '#687076', padding: 10 }}>No new notifications for now.</Text>
          ) : (
            notifications
              .filter(notification => {
                if (latestOrder && latestOrder.status === 'Finished') {
                  return false;
                }
                return true;
              })
              .map(renderActivityItem)
          )}
        </View>
      </ScrollView>

      <BookAppointment visible={modalVisible} onClose={() => setModalVisible(false)} />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          // Check if user has an ongoing order
          if (latestOrder && latestOrder.status !== 'Finished') {
            setRestrictionWarningVisible(true);
          } else {
            setModalVisible(true);
          }
        }}
      >
        <MaterialIcons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{details?.title || 'Details'}</Text>
              <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                <MaterialIcons name="close" size={22} color="#000" />
              </TouchableOpacity>
            </View>
            {(() => {
              if (!details) return <Text style={styles.modalBody}>Please check the "My Orders" page under the History section to review your feedback and check for admin response!</Text>;
              if (details.type === 'appointment_booked') {
                return (
                  <View>
                    <Text style={[styles.modalBody, { fontSize: 16, color: '#16A34A', fontWeight: '600' }]}>{details.message}</Text>
                  </View>
                );
              }
              if (details.type === 'order_completed') {
                return (
                  <View>
                    {details.scheduled_at && (
                      <Text style={[styles.modalBody, { color: '#1e88e5', fontSize: 16, fontWeight: '600' }]}>Next appointment: {formatDateTime12(details.scheduled_at)}</Text>
                    )}
                    {details.amount != null && (
                      <Text style={[styles.modalBody, { color: '#16A34A', fontSize: 18, fontWeight: '700', marginTop: 6 }]}>Please prepare ₱{details.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    )}
                  </View>
                );
              }
              if (details.type === 'ready_to_check') {
                return (
                  <View>
                    {details.scheduled_at && (
                      <Text style={[styles.modalBody, { color: '#1e88e5', fontSize: 16, fontWeight: '600' }]}>Next appointment: {formatDateTime12(details.scheduled_at)}</Text>
                    )}
                  </View>
                );
              }
              if (details.type === 'order_finished') {
                return (
                  <Text style={[styles.modalBody, { fontSize: 16 }]}>{details.message}</Text>
                );
              }
              if (details.type === 'order_details_updated') {
                return (
                  <Text style={[styles.modalBody, { fontSize: 16, color: '#16A34A', fontWeight: '600' }]}>{details.message}</Text>
                );
              }
              if (details.type === 'order_cancelled') {
                return (
                  <Text style={[styles.modalBody, { fontSize: 16, color: '#16A34A', fontWeight: '600' }]}>{details.message || ''}</Text>
                );
              }
              if (details.type === 'feedback_responded' || details.type === 'generic') {
                return (
                  <Text style={[styles.modalBody, { fontSize: 16 }]}>{details.body || 'No additional information.'}</Text>
                );
              }
              return <Text style={styles.modalBody}>No additional information.</Text>;
            })()}
          </View>
        </View>
      </Modal>

      {/* Finished Order Modal (shown before Feedback) */}
      <Modal
        visible={finishedVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setFinishedVisible(false);
          setFeedbackVisible(true);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Congratulations! Your order is now finished!</Text>
              <TouchableOpacity
                onPress={() => {
                  setFinishedVisible(false);
                  setFeedbackVisible(true);
                }}
              >
                <MaterialIcons name="close" size={22} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>
              Please check through the "My Orders" page under the History section to view your completed order
            </Text>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate your experience</Text>
              <TouchableOpacity onPress={() => setFeedbackVisible(false)}>
                <MaterialIcons name="close" size={22} color="#000" />
              </TouchableOpacity>
            </View>
            {pendingFeedback ? (
              <Text style={styles.modalBody}>
                {`Order: ${pendingFeedback.service_type || 'N/A'}`}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }}>
              {[1,2,3,4,5].map((v) => (
                <TouchableOpacity key={v} onPress={() => setFeedbackRating(v)} style={{ marginHorizontal: 6 }}>
                  <MaterialIcons
                    name={v <= feedbackRating ? 'star' : 'star-border'}
                    size={30}
                    color={v <= feedbackRating ? '#f5a623' : '#ccc'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              multiline
              placeholder="Optional comment"
              placeholderTextColor="#999"
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 80, color: '#000' }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <View style={{ padding: 10 }} />
              <TouchableOpacity
                disabled={feedbackRating === 0 || feedbackSubmitting || !pendingFeedback}
                onPress={async () => {
                  if (!pendingFeedback) return;
                  try {
                    setFeedbackSubmitting(true);
                    await api.post('/feedback', {
                      order_id: pendingFeedback.order_id,
                      rating: feedbackRating,
                      comment: feedbackComment || undefined,
                    });
                    setFeedbackVisible(false);
                    setPendingFeedback(null);
                    setFeedbackSuccess(true);
                    setTimeout(() => setFeedbackSuccess(false), 3000);
                  } catch (e) {
                    alert('Failed to submit feedback');
                  } finally {
                    setFeedbackSubmitting(false);
                  }
                }}
                style={{ backgroundColor: feedbackRating === 0 ? '#ccc' : '#4682B4', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{feedbackSubmitting ? 'Submitting...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Restriction Warning Modal */}
      <Modal
        visible={restrictionWarningVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRestrictionWarningVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Restricted</Text>
              <TouchableOpacity onPress={() => setRestrictionWarningVisible(false)}>
                <MaterialIcons name="close" size={22} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalBody, { fontSize: 16, textAlign: 'center', marginTop: 10 }]}>
              We're sorry but you cannot book more than one appointment. Please wait until your current order is finished.
            </Text>
          </View>
        </View>
      </Modal>

      {feedbackSuccess && (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 90, backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 }}>
          <Text style={{ color: '#16A34A', fontWeight: '700' }}>Feedback sent successfully!</Text>
        </View>
      )}

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
    paddingTop: 20,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#687076',
    marginTop: 5,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  orderInfo: {
    flex: 1,
    marginRight: 10,
  },
  sizeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 5,
  },
  sizeLabel: {
    fontSize: 14,
    color: '#687076',
    marginRight: 5,
  },
  sizeText: {
    fontSize: 14,
    color: '#687076',
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#000',
  },
  orderTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  orderTitle: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  itemText: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#000',
    marginBottom: 5,
  },
  itemDetail: {
    fontSize: 14,
    color: '#687076',
  },
  dateSection: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  dateLabel: {
    fontSize: 13,
    color: '#000',
    marginBottom: 2,
  },
  date: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  orderProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    gap: 6,
  },
  progressStep: {
    width: 16,
    height: 8,
    borderRadius: 4,
  },
  stepDone: {
    backgroundColor: '#A9A9A9',
  },
  stepCurrent: {
    backgroundColor: '#2E8B57', // Green for Completed
  },
  stepOrange: {
    backgroundColor: '#FFA500', // Orange for Pending
  },
  stepRed: {
    backgroundColor: '#e91e63', // Red for Ready to Check
  },
  stepPending: {
    backgroundColor: '#A9A9A9',
  },
  progressText: {
    fontSize: 12,
    color: '#687076',
    textAlign: 'right',
    flexShrink: 1,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    marginTop: 20,
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  indicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 15,
  },
  indicatorGreen: {
    backgroundColor: '#16A34A',
  },
  indicatorYellow: {
    backgroundColor: '#FFA500',
  },
  announcementIcon: {
    marginRight: 15,
  },
  announcementTitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 2,
  },
  announcementDate: {
    fontSize: 14,
    color: '#687076',
  },
  statusBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFA500',
    fontSize: 12,
    fontWeight: '500',
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 15,
    borderLeftWidth: 2,
    borderLeftColor: '#4682B4',
    paddingLeft: 15,
    position: 'relative',
  },
  activityDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginRight: 15,
    width: 45,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  activitySubtext: {
    fontSize: 12,
    color: '#687076',
    marginBottom: 4,
    lineHeight: 16,
  },
  activityTime: {
    fontSize: 12,
    color: '#687076',
  },
  newPill: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 5,
  },
  newPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4682B4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  viewMore: {
    color: '#4682B4',
    fontSize: 12,
    fontWeight: '500',
  },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '88%', backgroundColor: '#fff', borderRadius: 14, paddingTop: 22, paddingHorizontal: 22, paddingBottom: 12, elevation: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  modalBody: { fontSize: 17, color: '#000', lineHeight: 24, marginTop: 6 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#687076',
    flex: 1,
    textAlign: 'right',
  },
  editButton: {
    backgroundColor: '#4682B4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  dateInputText: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  timeDropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 4,
    marginBottom: 8,
    maxHeight: 200,
  },
  timeDropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unavailableSlot: {
    backgroundColor: '#f8f8f8',
    opacity: 0.7,
  },
  editSectionLabel: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
    marginTop: 10,
  },
  editInputField: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 8,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  editDropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 6,
    marginTop: -2,
    overflow: 'hidden',
    maxHeight: 200,
  },
  editDropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  editUnavailableSlot: {
    backgroundColor: '#f8f8f8',
    opacity: 0.7,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  successMessage: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 250,
  },
  successText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#16A34A',
    textAlign: 'center',
  },
});