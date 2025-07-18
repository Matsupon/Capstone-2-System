import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const SERVICE_TYPES = [
  'Jersey Production',
  'Custom Tailoring (eg. Uniforms)',
  'Repairs/Alterations (eg. incl. zippers, buttons, size alteration etc.)',
];

const TIMES = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ['00', '15', '30', '45'];
const AMPM = ['AM', 'PM'];

export default function BookAppointment({ visible, onClose }) {
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('');
  const [serviceDropdown, setServiceDropdown] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState({ hour: '10', minute: '00', ampm: 'AM' });
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [designImage, setDesignImage] = useState(null);
  const [gcashImage, setGcashImage] = useState(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setStep(1);
      setServiceType('');
      setSelectedDate(null);
      setFullName('');
      setPhone('');
      setNotes('');
      setDesignImage(null);
      setGcashImage(null);
      setSuccessVisible(false);
    }
  }, [visible]);

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfWeek = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Image picker
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

  // Success popup
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
        onClose(); // Close modal after success
      });
    }, 3000);
  };

  // Calendar rendering
  const renderCalendar = () => {
    const days = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfWeek(calendarMonth);
    const today = new Date();
    const isCurrentMonth =
      calendarMonth.getFullYear() === today.getFullYear() &&
      calendarMonth.getMonth() === today.getMonth();
    let dayCells = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      dayCells.push(<View key={`empty-${i}`} style={{ flex: 1 }} />);
    }
    
    // Day cells
    for (let d = 1; d <= days; d++) {
      const thisDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d);
      const isSelected = selectedDate &&
        thisDate.getFullYear() === selectedDate.getFullYear() &&
        thisDate.getMonth() === selectedDate.getMonth() &&
        thisDate.getDate() === selectedDate.getDate();
      
      dayCells.push(
        <TouchableOpacity
          key={d}
          style={{ flex: 1, alignItems: 'center', marginVertical: 4 }}
          onPress={() => setSelectedDate(thisDate)}
          disabled={thisDate < today}
        >
          <View style={{
            backgroundColor: isSelected ? '#3B82F6' : 'transparent',
            borderRadius: 16,
            width: 32,
            height: 32,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: thisDate < today ? 0.5 : 1
          }}>
            <Text style={{ 
              color: isSelected ? '#fff' : thisDate < today ? '#ccc' : '#000', 
              fontWeight: isSelected ? 'bold' : 'normal' 
            }}>
              {d}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    
    // Fill last row
    while (dayCells.length % 7 !== 0) {
      dayCells.push(<View key={`empty-end-${dayCells.length}`} style={{ flex: 1 }} />);
    }
    
    const rows = [];
    for (let i = 0; i < dayCells.length; i += 7) {
      rows.push(
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {dayCells.slice(i, i + 7)}
        </View>
      );
    }
    return rows;
  };

  // Format date/time for display
  const formatDate = (date) => {
    if (!date) return '';
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };
  
  const formatTime = (t) => `${t.hour}:${t.minute} ${t.ampm}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Step 1: Main Form */}
        {step === 1 ? (
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#222" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Book an Appointment</Text>
            </View>
            
            <ScrollView 
              contentContainerStyle={{ paddingBottom: 40 }} 
              showsVerticalScrollIndicator={false}
            >
              {/* Service Type */}
              <Text style={styles.label}>Select Service Type:</Text>
              <TouchableOpacity 
                style={styles.inputRow} 
                onPress={() => setServiceDropdown(!serviceDropdown)}
              >
                <MaterialCommunityIcons name="tshirt-crew" size={22} color="#4682B4" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, color: serviceType ? '#000' : '#aaa' }}>
                  {serviceType || 'Select service...'}
                </Text>
                <MaterialIcons 
                  name={serviceDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                  size={22} 
                  color="#222" 
                />
              </TouchableOpacity>
              
              {serviceDropdown && (
                <View style={styles.dropdownMenu}>
                  {SERVICE_TYPES.map((type) => (
                    <TouchableOpacity 
                      key={type} 
                      style={styles.dropdownItem} 
                      onPress={() => { 
                        setServiceType(type); 
                        setServiceDropdown(false); 
                      }}
                    >
                      <Text style={{ color: '#222' }}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Date Picker */}
              <Text style={[styles.label, { marginTop: 18 }]}>Choose Available Date</Text>
              <TouchableOpacity 
                style={styles.inputRow} 
                onPress={() => setDateModal(true)}
              >
                <MaterialIcons name="calendar-today" size={22} color="#4682B4" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, color: selectedDate ? '#000' : '#aaa' }}>
                  {selectedDate ? `${formatDate(selectedDate)} ${formatTime(selectedTime)}` : 'Select date and time...'}
                </Text>
                <MaterialIcons name="chevron-right" size={22} color="#222" />
              </TouchableOpacity>

              {/* Date Modal */}
              <Modal visible={dateModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    {/* Calendar header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                        <MaterialIcons name="chevron-left" size={28} color="#222" />
                      </TouchableOpacity>
                      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                        {calendarMonth.toLocaleString('default', { month: 'long' })} {calendarMonth.getFullYear()}
                      </Text>
                      <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                        <MaterialIcons name="chevron-right" size={28} color="#222" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Days of week */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, index) => (
    <Text key={`day-${index}`} style={{ flex: 1, textAlign: 'center', color: '#4682B4', fontWeight: 'bold' }}>
      {d}
    </Text>
  ))}
</View>
                    
                    {/* Calendar grid */}
                    {renderCalendar()}
                    
                    {/* Time picker */}
                    <Text style={{ marginTop: 16, fontWeight: 'bold' }}>Choose Available Time:</Text>
                    <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={styles.timePickerBox}>
                        <TextInput
                          style={styles.timeInput}
                          value={selectedTime.hour}
                          keyboardType="numeric"
                          maxLength={2}
                          onChangeText={v => setSelectedTime(t => ({ ...t, hour: v.replace(/[^0-9]/g, '').slice(0, 2) }))}
                        />
                      </View>
                      <Text style={{ fontSize: 18, marginHorizontal: 2 }}>:</Text>
                      <View style={styles.timePickerBox}>
                        <TextInput
                          style={styles.timeInput}
                          value={selectedTime.minute}
                          keyboardType="numeric"
                          maxLength={2}
                          onChangeText={v => setSelectedTime(t => ({ ...t, minute: v.replace(/[^0-9]/g, '').slice(0, 2) }))}
                        />
                      </View>
                      <View style={styles.timePickerBox}>
                        <TouchableOpacity onPress={() => setSelectedTime(t => ({ ...t, ampm: t.ampm === 'AM' ? 'PM' : 'AM' }))}>
                          <Text style={{ fontSize: 16 }}>{selectedTime.ampm}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.setDateBtn} 
                      onPress={() => setDateModal(false)}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>SET DATE AND TIME</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Input Details */}
              <Text style={[styles.label, { marginTop: 18 }]}>Input Details</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor="#aaa"
              />
              <TextInput
                style={styles.inputField}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#aaa"
              />
              <TextInput
                style={[styles.inputField, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Notes (e.g. Measurements or Size)"
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholderTextColor="#aaa"
              />
              
              {/* Upload Design */}
              <TouchableOpacity 
                style={styles.uploadBox} 
                onPress={() => pickImage(setDesignImage)}
              >
                <MaterialIcons name="photo-camera" size={28} color="#687076" style={{ marginRight: 10 }} />
                <Text style={{ color: '#687076' }}>Upload Design if applicable</Text>
                {designImage && <Image source={{ uri: designImage }} style={styles.uploadedImg} />}
              </TouchableOpacity>

              {/* Next Button */}
              <View style={{ alignItems: 'flex-end', marginTop: 18 }}>
                <TouchableOpacity 
                  style={styles.nextBtn} 
                  onPress={() => setStep(2)}
                  disabled={!serviceType || !selectedDate || !fullName}
                >
                  <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 16 }}>Next</Text>
                  <MaterialIcons name="chevron-right" size={22} color="#222" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        ) : (
          /* Step 2: Gcash Downpayment */
<View style={{ flex: 1 }}>
  <View style={styles.headerRow}>
    <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
      <Ionicons name="arrow-back" size={24} color="#222" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Gcash Downpayment</Text>
  </View>
  
  <ScrollView 
    contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }} 
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.gcashBox}>
      <Text style={styles.gcashLabel}>Amount: <Text style={{ fontWeight: 'bold' }}>P500.00</Text></Text>
      <Text style={styles.gcashLabel}>Send to: <Text style={{ fontWeight: 'bold' }}>0912 345 6789</Text></Text>
    </View>
    
    <TouchableOpacity 
      style={styles.uploadBox} 
      onPress={() => pickImage(setGcashImage)}
    >
      <MaterialIcons name="photo-camera" size={28} color="#687076" style={{ marginRight: 10 }} />
      <Text style={{ color: '#687076' }}>Upload Gcash payment proof</Text>
      {gcashImage && <Image source={{ uri: gcashImage }} style={styles.uploadedImg} />}
    </TouchableOpacity>
  </ScrollView>
  
  <TouchableOpacity 
    style={styles.bookBtn} 
    onPress={showSuccess}
  >
    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Book an Appointment</Text>
  </TouchableOpacity>
</View>
        )}
        
        {/* Success Popup */}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  timePickerBox: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 2,
    minWidth: 40,
    alignItems: 'center',
  },
  timeInput: {
    fontSize: 16,
    textAlign: 'center',
    color: '#222',
    width: 32,
  },
  setDateBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    marginTop: 18,
    paddingVertical: 10,
    alignItems: 'center',
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
  gcashHeader: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
    marginTop: 2,
    flex: 1,
    textAlign: 'left',
  },
  gcashBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 16,
    marginBottom: 18,
    marginTop: 1,
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