import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Animated, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format } from 'date-fns';

const SERVICE_TYPES = [
  'Jersey Production',
  'Custom Tailoring (eg. Uniforms)',
  'Repairs/Alterations (eg. incl. zippers, buttons, size alteration etc.)',
];

const SIZES = ['Extra Small', 'Small', 'Medium', 'Large', 'Extra Large'];

export default function BookAppointment({ visible, onClose }) {
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('');
  const [serviceDropdown, setServiceDropdown] = useState(false);
  const [notes, setNotes] = useState('');
  const [designImage, setDesignImage] = useState(null);
  const [gcashImage, setGcashImage] = useState(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const [sizes, setSizes] = useState({});
  const [quantity, setQuantity] = useState('');

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [preferredDueDate, setPreferredDueDate] = useState('');
  const [preferredDueDateRaw, setPreferredDueDateRaw] = useState(null);

  // Appointment date and time states
  const [isAppointmentDatePickerVisible, setAppointmentDatePickerVisibility] = useState(false);
  const [isAppointmentTimePickerVisible, setAppointmentTimePickerVisibility] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentDateRaw, setAppointmentDateRaw] = useState(null);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentTimeRaw, setAppointmentTimeRaw] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [timeDropdown, setTimeDropdown] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
    }
  }, [visible]);

  useEffect(() => {
    const total = Object.values(sizes).reduce((a, b) => a + (b || 0), 0);
    if (quantity === '' || Number(quantity) !== total) {
      setQuantity(String(total));
    }
  }, [sizes]);

  // Fetch available slots when appointment date changes
  useEffect(() => {
    if (appointmentDateRaw) {
      fetchAvailableSlots();
    }
  }, [appointmentDateRaw]);

  const fetchAvailableSlots = async () => {
    try {
      const response = await fetch(`${API_URL}/appointments/available-slots?date=${appointmentDateRaw}`);
      const data = await response.json();
      if (response.ok) {
        setAvailableSlots(data.available_slots);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const pickImage = async (setImage) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
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

  // Appointment date and time handlers
  const showAppointmentDatePicker = () => setAppointmentDatePickerVisibility(true);
  const hideAppointmentDatePicker = () => setAppointmentDatePickerVisibility(false);
  const handleAppointmentDateConfirm = (date) => {
    setAppointmentDate(format(date, 'MMMM d, yyyy'));
    setAppointmentDateRaw(format(date, 'yyyy-MM-dd'));
    setAppointmentTime(''); // Reset time when date changes
    setAppointmentTimeRaw(null);
    hideAppointmentDatePicker();
  };

  const showAppointmentTimePicker = () => setTimeDropdown(!timeDropdown);
  const handleTimeSelect = (time) => {
    setAppointmentTime(time);
    setAppointmentTimeRaw(time);
    setTimeDropdown(false);
  };

  const handleBookAppointment = async () => {
    const formData = new FormData();
    formData.append('service_type', serviceType);
    formData.append('sizes', JSON.stringify(sizes)); // Send as JSON string
    formData.append('total_quantity', quantity);
    formData.append('notes', notes);

    if (designImage) {
      const designImageInfo = await FileSystem.getInfoAsync(designImage);
      formData.append('design_image', {
        uri: designImage,
        name: designImageInfo.uri.split('/').pop(),
        type: 'image/jpeg',
      });
    }

    if (gcashImage) {
      const gcashImageInfo = await FileSystem.getInfoAsync(gcashImage);
      formData.append('gcash_proof', {
        uri: gcashImage,
        name: gcashImageInfo.uri.split('/').pop(),
        type: 'image/jpeg',
      });
    }

    formData.append('preferred_due_date', preferredDueDateRaw);
    formData.append('appointment_date', appointmentDateRaw);
    formData.append('appointment_time', appointmentTimeRaw);

    try {
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to book appointment');
      }

      // Success: show success popup, reset form, etc.
      showSuccess();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {step === 1 ? (
          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#222" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Book an Appointment</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Select Service Type:</Text>
              <TouchableOpacity style={styles.inputRow} onPress={() => setServiceDropdown(!serviceDropdown)}>
                <MaterialCommunityIcons name="tshirt-crew" size={22} color="#4682B4" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, color: serviceType ? '#000' : '#aaa' }}>
                  {serviceType || 'Select service...'}
                </Text>
                <MaterialIcons name={serviceDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color="#222" />
              </TouchableOpacity>

              {serviceDropdown && (
                <View style={styles.dropdownMenu}>
                  {SERVICE_TYPES.map((type) => (
                    <TouchableOpacity key={type} style={styles.dropdownItem} onPress={() => { setServiceType(type); setServiceDropdown(false); }}>
                      <Text style={{ color: '#222' }}>{type}</Text>
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
                      size={22}
                      color={sizes[size] ? '#4682B4' : '#aaa'}
                    />
                  </TouchableOpacity>
                  <Text style={{ flex: 1 }}>{size}</Text>
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

              <Text style={[styles.label, { marginTop: 18 }]}>Additional Information:</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Type 'None' if don't have any."
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholderTextColor="#aaa"
              />

              <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setDesignImage)}>
                <MaterialIcons name="photo-camera" size={28} color="#687076" style={{ marginRight: 10 }} />
                <Text style={{ color: '#687076' }}>Upload Design if applicable</Text>
                {designImage && <Image source={{ uri: designImage }} style={styles.uploadedImg} />}
              </TouchableOpacity>

              <View style={{ alignItems: 'flex-end', marginTop: 18 }}>
                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => setStep(2)}
                  disabled={!serviceType || !quantity}
                >
                  <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 16 }}>Next</Text>
                  <MaterialIcons name="chevron-right" size={22} color="#222" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#222" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Gcash Downpayment</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
              <View style={styles.gcashBox}>
                <Text style={styles.gcashLabel}>Amount: <Text style={{ fontWeight: 'bold' }}>P500.00</Text></Text>
                <Text style={styles.gcashLabel}>Send to: <Text style={{ fontWeight: 'bold' }}>0912 345 6789</Text></Text>
              </View>

              <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setGcashImage)}>
                <MaterialIcons name="photo-camera" size={28} color="#687076" style={{ marginRight: 10 }} />
                <Text style={{ color: '#687076' }}>Upload Gcash payment proof</Text>
                {gcashImage && <Image source={{ uri: gcashImage }} style={styles.uploadedImg} />}
              </TouchableOpacity>

              <Text style={styles.label}>Preferred Due Date (When do you want it finished?)</Text>
              <TouchableOpacity onPress={showDatePicker} style={styles.inputField}>
                <Text style={{ color: preferredDueDate ? '#000' : '#aaa' }}>
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

              <Text style={styles.label}>Select Date and Time to Book Appointment</Text>
              <TouchableOpacity onPress={showAppointmentDatePicker} style={styles.inputField}>
                <Text style={{ color: appointmentDate ? '#000' : '#aaa' }}>
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
                  <Text style={styles.label}>Select Time</Text>
                  <TouchableOpacity style={styles.inputRow} onPress={showAppointmentTimePicker}>
                    <MaterialIcons name="schedule" size={22} color="#4682B4" style={{ marginRight: 10 }} />
                    <Text style={{ flex: 1, color: appointmentTime ? '#000' : '#aaa' }}>
                      {appointmentTime || 'Select time...'}
                    </Text>
                    <MaterialIcons name={timeDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color="#222" />
                  </TouchableOpacity>

                  {timeDropdown && (
                    <View style={styles.dropdownMenu}>
                      {availableSlots.length > 0 ? (
                        availableSlots.map((time) => (
                          <TouchableOpacity key={time} style={styles.dropdownItem} onPress={() => handleTimeSelect(time)}>
                            <Text style={{ color: '#222' }}>{time}</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.dropdownItem}>
                          <Text style={{ color: '#999' }}>No available slots for this date</Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.bookBtn, (!gcashImage || !preferredDueDate || !appointmentDate || !appointmentTime) && styles.bookBtnDisabled]} 
              onPress={handleBookAppointment}
              disabled={!gcashImage || !preferredDueDate || !appointmentDate || !appointmentTime}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Book an Appointment</Text>
            </TouchableOpacity>
          </View>
        )}

        {successVisible && (
          <Animated.View style={[styles.successPopup, { opacity: fadeAnim }]}>
            <MaterialIcons name="check-circle" size={40} color="#22C55E" />
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 8, textAlign: 'center' }}>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  label: {
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
    height: 48,
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inputField: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
    color: '#222',
    fontSize: 15,
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
    fontSize: 16,
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
});
