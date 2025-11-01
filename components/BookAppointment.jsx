import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Animated, Dimensions, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import api from '../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SERVICE_TYPES = [
  'Jersey Production',
  'Custom Tailoring (eg. Uniforms)',
  'Repairs/Alterations (eg. incl. zippers, buttons, size alteration etc.)',
];

const SIZES = ['Extra Small', 'Small', 'Medium', 'Large', 'Extra Large'];

// Generate time slots with 30-minute intervals (8:00 AM to 8:00 PM)
// Excluding lunch time (12:00 PM and 12:30 PM)
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
      const minuteStr = minute < 10 ? `0${minute}` : `${minute}`;
      const time = `${hourStr}:${minuteStr}`;
      // Exclude lunch time (12:00 and 12:30)
      if (time !== '12:00' && time !== '12:30') {
        slots.push(time);
      }
    }
  }
  return slots;
};

export default function BookAppointment({ visible, onClose }) {
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('');
  const [serviceDropdown, setServiceDropdown] = useState(false);
  const [notes, setNotes] = useState('');
  const [designImage, setDesignImage] = useState(null);
  const [gcashImage, setGcashImage] = useState(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isLoading, setIsLoading] = useState(false);

  const [sizes, setSizes] = useState({});
  const [quantity, setQuantity] = useState('');

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [preferredDueDate, setPreferredDueDate] = useState('');
  const [preferredDueDateRaw, setPreferredDueDateRaw] = useState(null);

  const [isAppointmentDatePickerVisible, setAppointmentDatePickerVisibility] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentDateRaw, setAppointmentDateRaw] = useState(null);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentTimeRaw, setAppointmentTimeRaw] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [timeDropdown, setTimeDropdown] = useState(false);
  const [adminPhoneNumber, setAdminPhoneNumber] = useState('0912 345 6789'); // Default fallback
      

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setServiceType('');
      setNotes('');
      setDesignImage(null);
      setGcashImage(null);
      setSuccessVisible(false);
      setSizes({});
      setQuantity('');
      setPreferredDueDate('');
      setPreferredDueDateRaw(null);
      setAppointmentDate('');
      setAppointmentDateRaw(null);
      setAppointmentTime('');
      setAppointmentTimeRaw(null);
      setAvailableSlots([]);
      setTimeDropdown(false);
      setIsLoading(false);
    }
    if (appointmentDateRaw) {
      fetchAvailableSlots();
    }
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('authToken');
      console.log("Current token:", token);
    };
    checkToken();
    
    // Fetch admin phone number (using customer-accessible endpoint)
    const fetchAdminPhone = async () => {
      try {
        const response = await api.get('/admin/contact');
        console.log('Admin contact response:', response.data);
        if (response.data?.success && response.data?.data?.phone) {
          setAdminPhoneNumber(response.data.data.phone);
          console.log('Admin phone number set to:', response.data.data.phone);
        }
      } catch (error) {
        console.log('Could not fetch admin phone, using default:', error);
        // Fallback to default if API fails
      }
    };
    fetchAdminPhone();
  }, [visible]);

  useEffect(() => {
    const total = Object.values(sizes).reduce((a, b) => a + (b || 0), 0);
    if (quantity === '' || Number(quantity) !== total) {
      setQuantity(String(total));
    }
  }, [sizes]);

  useEffect(() => {
    if (appointmentDateRaw) {
      fetchAvailableSlots();
    }
  }, [appointmentDateRaw]);

  const fetchAvailableSlots = async () => {
    try {
      console.log("Fetching slots for date:", appointmentDateRaw);
      
      // Check if the selected date is in the past
      const selectedDate = new Date(appointmentDateRaw);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        console.log("Selected date is in the past, clearing available slots");
        setAvailableSlots([]);
        return;
      }
      
      const response = await api.get(`/appointments/available-slots?date=${appointmentDateRaw}`);
      
      console.log("Available slots data:", response.data);
      setAvailableSlots(response.data.available_slots || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      Alert.alert('Error', 'Failed to fetch available time slots. Please try again.');
      setAvailableSlots([]);
    }
  };

  // Image picker; for design images we enable cropping by default
  const pickImage = async (setImage, crop = false) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: crop, // crop when requested by caller
      // aspect removed to avoid forced cropping; user can free-crop when allowsEditing is true
      quality: 1,
      exif: true,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      try {
        const asset = result.assets[0];
        const manip = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1280 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setImage(manip.uri);
      } catch (e) {
        setImage(result.assets[0].uri);
      }
    }
  };

  // No pre-choice dialog. For design images we enable cropping by default; for gcash we don't crop.

  // Validate step 1 inputs before proceeding to step 2
  const handleNextStep1 = () => {
    const total = Object.values(sizes).reduce((a, b) => a + (b || 0), 0);
    if (!serviceType) {
      Alert.alert('Missing Service Type', 'Please select a service type to continue.');
      return;
    }
    if (total <= 0) {
      Alert.alert('Select Sizes', 'Please select at least one size and specify its quantity.');
      return;
    }
    if (!quantity || Number(quantity) !== total) {
      Alert.alert('Quantity Mismatch', 'Total quantity must match the sum of selected sizes.');
      return;
    }
    setStep(2);
  };

  // Validate step 2 inputs before proceeding to step 3
  const handleNextStep2 = () => {
    if (!designImage && !gcashImage) {
      Alert.alert('Missing Files', 'Please upload at least one file to continue.');
      return;
    }
    if (!gcashImage) {
      Alert.alert('Missing GCash Proof', 'Please upload your GCash payment proof to continue.');
      return;
    }
    setStep(3);
  };

  const formatTo12Hour = (time24) => {
    const [hour, minute] = time24.split(':');
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${period}`;
  };

  const showSuccess = () => {
    setSuccessVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setSuccessVisible(false);
        onClose();
      });
    }, 3000);
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleConfirm = (date) => {
    setPreferredDueDate(format(date, 'MMMM d, yyyy'));
    setPreferredDueDateRaw(format(date, 'yyyy-MM-dd'));
    hideDatePicker();
  };

  const showAppointmentDatePicker = () => setAppointmentDatePickerVisibility(true);
  const hideAppointmentDatePicker = () => setAppointmentDatePickerVisibility(false);
  const handleAppointmentDateConfirm = (date) => {
    setAppointmentDate(format(date, 'MMMM d, yyyy'));
    setAppointmentDateRaw(format(date, 'yyyy-MM-dd'));
    setAppointmentTime('');
    setAppointmentTimeRaw(null);
    hideAppointmentDatePicker();
  };

  const showAppointmentTimePicker = () => setTimeDropdown(!timeDropdown);
  const handleTimeSelect = (time) => {
    setAppointmentTime(formatTo12Hour(time));
    setAppointmentTimeRaw(time);
    setTimeDropdown(false);
  };

  const handleBookAppointment = async () => {
    try {
      // Step 3 validations with specific messages
      if (!preferredDueDateRaw) {
        Alert.alert('Missing Preferred Due Date', 'Please select your preferred due date.');
        return;
      }
      if (!appointmentDateRaw) {
        Alert.alert('Missing Appointment Date', 'Please select an appointment date.');
        return;
      }
      if (!appointmentTimeRaw) {
        Alert.alert('Missing Appointment Time', 'Please select an appointment time.');
        return;
      }

      setIsLoading(true);
    
      const formData = new FormData();
      formData.append('service_type', serviceType);
      formData.append('sizes', JSON.stringify(sizes));
      formData.append('total_quantity', quantity);
      formData.append('notes', notes || 'None');
    
      const inferFileMeta = (uri) => {
        try {
          const filename = uri.split('/').pop() || 'upload.jpg';
          const lower = filename.toLowerCase();
          let type = 'image/jpeg';
          if (lower.endsWith('.png')) type = 'image/png';
          else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.jpe')) type = 'image/jpeg';
          else if (lower.endsWith('.heic')) type = 'image/heic';
          return { name: filename, type };
        } catch {
          return { name: 'upload.jpg', type: 'image/jpeg' };
        }
      };

      if (designImage) {
        const meta = inferFileMeta(designImage);
        formData.append('design_image', {
          uri: designImage,
          name: meta.name,
          type: meta.type,
        });
      }
    
      if (gcashImage) {
        const meta = inferFileMeta(gcashImage);
        formData.append('gcash_proof', {
          uri: gcashImage,
          name: meta.name,
          type: meta.type,
        });
      }
    
      formData.append('preferred_due_date', preferredDueDateRaw);
      formData.append('appointment_date', appointmentDateRaw);
      formData.append('appointment_time', appointmentTimeRaw);
    
      console.log("Sending appointment data:", {
        service_type: serviceType,
        sizes: JSON.stringify(sizes),
        total_quantity: quantity,
        notes: notes || 'None',
        preferred_due_date: preferredDueDateRaw,
        appointment_date: appointmentDateRaw,
        appointment_time: appointmentTimeRaw
      });
      
      for (let [key, value] of formData.entries()) {
        console.log(`FormData ${key}:`, value);
      }
      
      const response = await api.post('/appointments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });
      
      console.log("Booking response:", response.data);
      showSuccess();
      
    } catch (error) {
      console.error('Booking failed:', error);
      
      let errorMessage = 'Failed to book appointment.';
      let errorTitle = 'Booking Failed';
      
      if (error.message === 'Network Error') {
        errorTitle = 'Network Connection Failed';
        errorMessage = 'Cannot connect to the server. Please check:\n\n' +
                      '1. Backend server is running on 192.168.137.170:8000\n' +
                      '2. Both devices are on the same network\n' +
                      '3. No firewall blocking the connection\n' +
                      '4. Try using the "Test Network" button first';
      } else if (error.code === 'ECONNABORTED') {
        errorTitle = 'Connection Timeout';
        errorMessage = 'Server is not responding. Please check if the backend is running.';
      } else if (error.response) {
        console.error('Error response:', error.response.data);
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your internet connection.';
      } else {
        console.error('Request setup error:', error.message);
        errorMessage = `Request error: ${error.message}`;
      }
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Progress Indicator Component
  const ProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressStep}>
        <View style={[styles.progressCircle, step >= 1 && styles.progressCircleActive]}>
          <Text style={[styles.progressNumber, step >= 1 && styles.progressNumberActive]}>1</Text>
        </View>
        <Text style={[styles.progressLabel, step >= 1 && styles.progressLabelActive]}>Order Details</Text>
      </View>
      <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
      <View style={styles.progressStep}>
        <View style={[styles.progressCircle, step >= 2 && styles.progressCircleActive]}>
          <Text style={[styles.progressNumber, step >= 2 && styles.progressNumberActive]}>2</Text>
        </View>
        <Text style={[styles.progressLabel, step >= 2 && styles.progressLabelActive]}>Upload Images</Text>
      </View>
      <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
      <View style={styles.progressStep}>
        <View style={[styles.progressCircle, step >= 3 && styles.progressCircleActive]}>
          <Text style={[styles.progressNumber, step >= 3 && styles.progressNumberActive]}>3</Text>
        </View>
        <Text style={[styles.progressLabel, step >= 3 && styles.progressLabelActive]}>Schedule</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={step === 1 ? onClose : () => setStep(step - 1)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={28} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book an Appointment</Text>
        </View>

        {/* Progress Indicator */}
        <ProgressIndicator />

        {step === 1 ? (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Section Title */}
              <Text style={styles.sectionTitle}>🧾 Order Details</Text>
              
              <Text style={styles.label}>Select Service Type:</Text>
              <TouchableOpacity style={styles.inputRow} onPress={() => setServiceDropdown(!serviceDropdown)}>
                <MaterialCommunityIcons name="tshirt-crew" size={24} color="#4682B4" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, color: serviceType ? '#000' : '#aaa', fontSize: 16 }}>
                  {serviceType || 'Select service...'}
                </Text>
                <MaterialIcons name={serviceDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#222" />
              </TouchableOpacity>

              {serviceDropdown && (
                <View style={styles.dropdownMenu}>
                  {SERVICE_TYPES.map((type) => (
                    <TouchableOpacity key={type} style={styles.dropdownItem} onPress={() => { setServiceType(type); setServiceDropdown(false); }}>
                      <Text style={{ color: '#222', fontSize: 16 }}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { marginTop: 18 }]}>Select Sizes and Quantities:</Text>
              {SIZES.map((size) => (
                <View key={size} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <TouchableOpacity
                    style={{ marginRight: 10 }}
                    onPress={() => setSizes((prev) => ({ ...prev, [size]: prev[size] ? 0 : 1 }))}
                  >
                    <MaterialIcons
                      name={sizes[size] ? 'check-box' : 'check-box-outline-blank'}
                      size={24}
                      color={sizes[size] ? '#4682B4' : '#aaa'}
                    />
                  </TouchableOpacity>
                  <Text style={{ flex: 1, fontSize: 16 }}>{size}</Text>
                  {sizes[size] !== undefined && (
                    <TextInput
                      style={[styles.inputField, { width: 80, height: 40, marginBottom: 0 }]}
                      placeholder="Qty"
                      value={sizes[size] ? String(sizes[size]) : ''}
                      onChangeText={(val) => {
                        const num = val.replace(/[^0-9]/g, '');
                        setSizes((prev) => ({ ...prev, [size]: num ? parseInt(num) : 0 }));
                      }}
                      keyboardType="numeric"
                      placeholderTextColor="#aaa"
                    />
                  )}
                </View>
              ))}

              <Text style={[styles.label, { marginTop: 18 }]}>Total Quantity:</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Total number of items"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />

              <View style={{ alignItems: 'center', marginTop: 30 }}>
                <TouchableOpacity
                  style={styles.nextBtnCentered}
                  onPress={handleNextStep1}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Next</Text>
                  <MaterialIcons name="chevron-right" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        ) : step === 2 ? (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Section Title */}
              <Text style={styles.sectionTitle}>📎 Upload Files</Text>

              <Text style={styles.label}>📷 Design Reference (Optional)</Text>
              <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setDesignImage, true)}>
                <MaterialIcons name="photo-camera" size={32} color="#687076" style={{ marginRight: 10 }} />
                <Text style={{ color: '#687076', fontSize: 16 }}>Upload Design if applicable</Text>
              </TouchableOpacity>
              {designImage && <Image source={{ uri: designImage }} style={styles.uploadedPreview} />}

              <View style={styles.gcashBox}>
                <Text style={styles.gcashLabel}>💸 GCash Payment</Text>
                <Text style={styles.gcashLabel}>Amount: <Text style={{ fontWeight: 'bold' }}>P500.00</Text></Text>
                <Text style={styles.gcashLabel}>Send to: <Text style={{ fontWeight: 'bold' }}>{adminPhoneNumber}</Text></Text>
              </View>

              <Text style={styles.label}>💸 GCash Payment Proof (Required)</Text>
              <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setGcashImage, true)}>
                <MaterialIcons name="photo-camera" size={32} color="#687076" style={{ marginRight: 10 }} />
                <Text style={{ color: '#687076', fontSize: 16 }}>Upload Gcash payment proof</Text>
              </TouchableOpacity>
              {gcashImage && <Image source={{ uri: gcashImage }} style={styles.uploadedPreview} />}

              <View style={{ alignItems: 'center', marginTop: 30 }}>
                <TouchableOpacity
                  style={styles.nextBtnCentered}
                  onPress={handleNextStep2}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Next</Text>
                  <MaterialIcons name="chevron-right" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        ) : (
<View style={{ flex: 1 }}>
  <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
    {/* Section Title */}
    <Text style={styles.sectionTitle}>🗓️ Appointment Schedule</Text>

    <Text style={[styles.label, { fontSize: 18 }]}>📅 Select Date and Time</Text>
    <TouchableOpacity onPress={showAppointmentDatePicker} style={styles.inputField}>
      <Text style={{ color: appointmentDate ? '#000' : '#aaa', fontSize: 17 }}>
        {appointmentDate || 'Pick appointment date'}
      </Text>
    </TouchableOpacity>
    <DateTimePickerModal
      isVisible={isAppointmentDatePickerVisible}
      mode="date"
      onConfirm={handleAppointmentDateConfirm}
      onCancel={hideAppointmentDatePicker}
      minimumDate={new Date()}
    />

    {appointmentDate && (
      <>
        <Text style={[styles.label, { fontSize: 17 }]}>Select Time</Text>
        <TouchableOpacity style={styles.inputRow} onPress={showAppointmentTimePicker}>
          <MaterialIcons name="schedule" size={24} color="#4682B4" style={{ marginRight: 10 }} />
          <Text style={{ flex: 1, color: appointmentTime ? '#000' : '#aaa', fontSize: 17 }}>
            {appointmentTime || 'Select time...'}
          </Text>
          <MaterialIcons
            name={timeDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color="#222"
          />
        </TouchableOpacity>

        {timeDropdown && (
          <View style={styles.dropdownMenu}>
            {generateTimeSlots().map((time) => {
              const isAvailable = availableSlots.includes(time);
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.dropdownItem,
                    !isAvailable && styles.unavailableSlot,
                  ]}
                  onPress={() => isAvailable && handleTimeSelect(time)}
                  disabled={!isAvailable}
                >
                  <Text
                    style={{
                      color: isAvailable ? '#222' : '#aaa',
                      fontWeight: isAvailable ? '600' : '400',
                      fontSize: 16,
                    }}
                  >
                    {formatTo12Hour(time)}
                    {!isAvailable && ' (Not Available)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </>
    )}

    <Text style={[styles.label, { fontSize: 18 }]}>📅 Preferred Due Date</Text>
    <Text style={[styles.helperText, { fontSize: 15 }]}>When do you want it finished?</Text>
    <TouchableOpacity onPress={showDatePicker} style={styles.inputField}>
      <Text style={{ color: preferredDueDate ? '#000' : '#aaa', fontSize: 17 }}>
        {preferredDueDate || 'Pick a date'}
      </Text>
    </TouchableOpacity>
    <DateTimePickerModal
      isVisible={isDatePickerVisible}
      mode="date"
      onConfirm={handleConfirm}
      onCancel={hideDatePicker}
      minimumDate={new Date()}
    />
  </ScrollView>

  <TouchableOpacity
    style={[styles.bookBtn, isLoading && styles.bookBtnDisabled]}
    onPress={handleBookAppointment}
    disabled={isLoading}
  >
    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
      {isLoading ? 'Booking...' : 'Book an Appointment'}
    </Text>
  </TouchableOpacity>
</View>
        )}

        {successVisible && (
          <Animated.View style={[styles.successPopup, { opacity: fadeAnim }]}>
            <MaterialIcons name="check-circle" size={48} color="#22C55E" />
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginTop: 8, textAlign: 'center' }}>
              You have successfully booked an appointment!
            </Text>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
  },
  testButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testBtn: {
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4682B4',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
    marginTop: 10,
  },
  inputRow: {
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
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 6,
    marginTop: -2,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inputField: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 8,
    color: '#222',
    fontSize: 17,
  },
  uploadBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadedImg: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginLeft: 10,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gcashBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 16,
    marginBottom: 18,
  },
  gcashLabel: {
    fontSize: 18,
    color: '#222',
    marginBottom: 6,
  },
  bookBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 10,
  },
  bookBtnDisabled: {
    backgroundColor: '#ccc',
  },
  successPopup: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  unavailableSlot: {
    backgroundColor: '#f8f8f8',
    opacity: 0.7
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: SCREEN_WIDTH < 350 ? 8 : 12,
  },
  progressStep: {
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH < 350 ? 65 : SCREEN_WIDTH < 380 ? 85 : 110,
  },
  progressCircle: {
    width: SCREEN_WIDTH < 350 ? 32 : 40,
    height: SCREEN_WIDTH < 350 ? 32 : 40,
    borderRadius: SCREEN_WIDTH < 350 ? 16 : 20,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressCircleActive: {
    backgroundColor: '#3B82F6',
  },
  progressNumber: {
    fontSize: SCREEN_WIDTH < 350 ? 14 : 18,
    fontWeight: 'bold',
    color: '#999',
  },
  progressNumberActive: {
    color: '#fff',
  },
  progressLabel: {
    fontSize: SCREEN_WIDTH < 350 ? 9 : SCREEN_WIDTH < 380 ? 10 : 11,
    color: '#999',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: SCREEN_WIDTH < 350 ? 12 : 14,
  },
  progressLabelActive: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  progressLine: {
    width: SCREEN_WIDTH < 350 ? 20 : SCREEN_WIDTH < 380 ? 30 : 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: SCREEN_WIDTH < 350 ? 4 : 6,
  },
  progressLineActive: {
    backgroundColor: '#3B82F6',
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  nextBtnCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 40,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadedPreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  helperText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
});
