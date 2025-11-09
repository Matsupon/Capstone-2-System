import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Header from '../../components/Header';
import api from '../../utils/api';

export default function ProfilePage() {
  const headerRefreshFn = useRef(null);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // My Appointments Modal States
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [modalSlideAnim] = useState(new Animated.Value(0));
  
  // Edit appointment states
  const [editAppointmentDate, setEditAppointmentDate] = useState(''); // Display format: "MMMM d, yyyy"
  const [editAppointmentDateRaw, setEditAppointmentDateRaw] = useState(''); // Raw format: "yyyy-MM-dd"
  const [editAppointmentTime, setEditAppointmentTime] = useState(''); // Display format: "12:30 PM"
  const [editAppointmentTimeRaw, setEditAppointmentTimeRaw] = useState(''); // Raw format: "12:30"
  const [editDueDate, setEditDueDate] = useState(''); // Display format: "MMMM d, yyyy"
  const [editDueDateRaw, setEditDueDateRaw] = useState(''); // Raw format: "yyyy-MM-dd"
  const [availableSlots, setAvailableSlots] = useState([]);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [loadingAvailableSlots, setLoadingAvailableSlots] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [isAppointmentDatePickerVisible, setAppointmentDatePickerVisibility] = useState(false);
  const [isDueDatePickerVisible, setDueDatePickerVisibility] = useState(false);
  const [appointmentDatePickerMinimumDate, setAppointmentDatePickerMinimumDate] = useState(new Date());
  const [dueDatePickerMinimumDate, setDueDatePickerMinimumDate] = useState(new Date());
  
  // Image zoom modal states
  const [showImageZoomModal, setShowImageZoomModal] = useState(false);
  const [zoomedImageUri, setZoomedImageUri] = useState(null);
  const [zoomedImageTitle, setZoomedImageTitle] = useState('');

  // Generate time slots (same as BookAppointment)
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

  const showSuccessMessage = () => {
    setShowSuccessModal(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      hideSuccessMessage();
    }, 2000);
  };

  const hideSuccessMessage = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start(() => {
      setShowSuccessModal(false);
    });
  };

  const fetchUserData = async () => {
    try {
      const response = await api.get('/user');
      
      setUser(response.data.user);
      setProfileImageUrl(response.data.user?.image_url); 

      if (response.data.image_url) {
        setProfileImageUrl(response.data.image_url);
      }

      // initialize form fields
      const u = response.data.user || {};
      setForm({
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        address: u.address || '',
        password: '',
      });
    } catch (error) {
      console.error('Failed to fetch user:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const formData = new FormData();
      let hasChanges = false;
      
      // Add text fields (only if they differ from current user data)
      if (form.name && form.name !== user?.name) {
        formData.append('name', form.name);
        hasChanges = true;
      }
      if (form.email && form.email !== user?.email) {
        formData.append('email', form.email);
        hasChanges = true;
      }
      if (form.phone && form.phone !== user?.phone) {
        formData.append('phone', form.phone);
        hasChanges = true;
      }
      if (form.address && form.address !== user?.address) {
        formData.append('address', form.address);
        hasChanges = true;
      }
      if (form.password && form.password.trim() !== '') {
        formData.append('password', form.password);
        hasChanges = true;
      }

      // Add profile image if tempImage exists (user selected a new image)
      if (tempImage) {
        // Compress image before including in FormData
        let finalImageUri = tempImage;
        try {
          console.log('📦 Compressing profile image for save...');
          const compressed = await ImageManipulator.manipulateAsync(
            tempImage,
            [{ resize: { width: 512 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          finalImageUri = compressed.uri;
          console.log('✅ Profile image compressed for save');
        } catch (compressError) {
          console.warn('⚠️ Failed to compress profile image, using original:', compressError);
          finalImageUri = tempImage;
        }

        const fileType = 'image/jpeg'; // Always JPEG after compression
        const fileName = `profile_${user.id}_${Date.now()}.jpg`;
        formData.append('profile_image', {
          uri: finalImageUri,
          name: fileName,
          type: fileType,
        });
        hasChanges = true;
        console.log('📦 Including profile image in FormData:', { uri: finalImageUri, name: fileName, type: fileType });
      }

      // Check if there are any changes to save
      if (!hasChanges) {
        Alert.alert('No Changes', 'No changes detected. Please modify at least one field before saving.');
        return;
      }

      console.log('📤 Sending profile update request...', {
        hasImage: !!tempImage,
        fields: {
          name: form.name !== user?.name,
          email: form.email !== user?.email,
          phone: form.phone !== user?.phone,
          address: form.address !== user?.address,
          password: form.password && form.password.trim() !== '',
        },
        serverURL: api.defaults.baseURL,
        formDataKeys: tempImage ? 'Has FormData with image' : 'FormData without image',
      });
      
      // If no image, try sending as JSON first (more reliable on weak networks)
      // If image exists, must use FormData
      let response;
      if (!tempImage) {
        // Convert FormData to JSON object for text-only updates
        const jsonData = {};
        if (form.name && form.name !== user?.name) jsonData.name = form.name;
        if (form.email && form.email !== user?.email) jsonData.email = form.email;
        if (form.phone && form.phone !== user?.phone) jsonData.phone = form.phone;
        if (form.address && form.address !== user?.address) jsonData.address = form.address;
        if (form.password && form.password.trim() !== '') jsonData.password = form.password;
        
        console.log('📤 Sending as JSON (no image):', jsonData);
        response = await api.post('/profile', jsonData, {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
      } else {
        // Use FormData when image is included
        console.log('📤 Sending as FormData (with image)');
        
        // CRITICAL FIX: Use React Native's fetch API directly for FormData uploads
        // React Native's XMLHttpRequest (used by axios) has a bug that sets wrong Content-Type
        // Using fetch API directly ensures FormData is handled correctly with multipart/form-data
        const token = await AsyncStorage.getItem('authToken');
        const apiBaseUrl = api.defaults.baseURL;
        const fullUrl = `${apiBaseUrl}/profile`;
        
        console.log('🚀 Using fetch API for profile update with image to:', fullUrl);
        
        const fetchResponse = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            // DO NOT set Content-Type - React Native fetch will set it automatically with boundary
          },
          body: formData,
        });
        
        // Check if response is OK
        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json().catch(() => ({ message: 'Unknown error' }));
          throw {
            response: {
              status: fetchResponse.status,
              statusText: fetchResponse.statusText,
              data: errorData,
            },
            message: errorData.message || `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`,
          };
        }
        
        const responseData = await fetchResponse.json();
        // Convert fetch response to axios-like response for compatibility
        response = {
          data: responseData,
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          headers: fetchResponse.headers,
        };
      }

      console.log('✅ Profile update successful:', response.data);
      
      setUser(response.data.user);
      setProfileImageUrl(response.data.image_url);
      setTempImage(null); // Clear temp image after successful upload
      setIsEditing(false);
      showSuccessMessage();
      // Refresh notifications in header (in case profile update triggers a notification)
      if (headerRefreshFn.current) {
        setTimeout(() => {
          headerRefreshFn.current?.refreshNotifications();
        }, 500);
      }
    } catch (error) {
      console.error('❌ Profile save failed:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
      });
      
      // Reset temp image on error so user can try again
      if (tempImage) {
        setTempImage(null);
      }
      
      let errorMessage = 'Could not update profile.';
      if (error.response) {
        // Server responded with an error status
        const responseData = error.response.data;
        if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.errors) {
          const errors = responseData.errors;
          errorMessage = Object.values(errors).flat().join('\n');
        }
      } else if (error.message && (error.message.includes('Network') || error.message.includes('fetch'))) {
        // Network error (fetch API doesn't have error.code like axios)
        const serverURL = api.defaults.baseURL?.replace('/api', '') || 'the server';
        errorMessage = `Network error. Please check:\n\n1. Your internet connection\n2. Server is running at ${serverURL}\n3. Try again in a moment`;
      } else {
        // Unknown error
        errorMessage = error.message || 'Unknown error occurred. Please try again.';
      }
      
      Alert.alert('Update Failed', errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      // Try to logout on server, but always clear local token and redirect
      try {
        await api.post('/logout', {});
      } catch (logoutError) {
        // Even if logout fails on server, continue with local cleanup
        console.log('Server logout failed (may already be logged out):', logoutError?.response?.status);
      }
      await AsyncStorage.removeItem('authToken');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Always clear token and redirect even if there's an error
      try {
        await AsyncStorage.removeItem('authToken');
      } catch (storageError) {
        console.log('Error removing token:', storageError);
      }
      router.replace('/auth/login');
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const pickImage = async () => {
    console.log('Edit icon pressed');
    if (uploading) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow access to gallery to choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setTempImage(uri);
      await uploadProfileImage(uri);
    }
  };

  const uploadProfileImage = async (uri) => {
    setUploading(true);
    try {
      // Compress and optimize image before upload to reduce payload size and improve reliability
      let finalImageUri = uri;
      try {
        console.log('📦 Compressing profile image...');
        const compressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 512 } }], // Resize to max 512px width for profile images (smaller than design images)
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Good compression while maintaining quality
        );
        finalImageUri = compressed.uri;
        console.log('✅ Profile image compressed');
      } catch (compressError) {
        console.warn('⚠️ Failed to compress profile image, using original:', compressError);
        finalImageUri = uri;
      }

      // Quick connectivity check before attempting upload
      try {
        await api.get('/user', { timeout: 5000 });
        console.log('✅ Connectivity check passed');
      } catch (connectError) {
        console.warn('⚠️ Connectivity check failed:', connectError.message);
        // Continue anyway, but user will see error if server is truly unreachable
      }

      const formData = new FormData();
      const fileType = 'image/jpeg'; // Always JPEG after compression
      const fileName = `profile_${user?.id || 'user'}_${Date.now()}.jpg`;
  
      formData.append('profile_image', {
        uri: finalImageUri,
        name: fileName,
        type: fileType,
      });
  
      console.log('📦 Uploading profile image:', { 
        uri: finalImageUri, 
        name: fileName, 
        type: fileType, 
        serverURL: api.defaults.baseURL 
      });
  
      // CRITICAL FIX: Use React Native's fetch API directly for FormData uploads
      // React Native's XMLHttpRequest (used by axios) has a bug that sets wrong Content-Type
      // Using fetch API directly ensures FormData is handled correctly with multipart/form-data
      const token = await AsyncStorage.getItem('authToken');
      const apiBaseUrl = api.defaults.baseURL;
      const fullUrl = `${apiBaseUrl}/profile`;
      
      console.log('🚀 Using fetch API for profile image upload to:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          // DO NOT set Content-Type - React Native fetch will set it automatically with boundary
        },
        body: formData,
      });
      
      // Check if response is OK
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw {
          response: {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
          },
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      
      const responseData = await response.json();
      console.log('✅ Profile image upload successful:', responseData);
  
      setUser(responseData.user);
      setProfileImageUrl(responseData.image_url); 
      setTempImage(null);
      showSuccessMessage();
      // Refresh notifications in header (in case profile image update triggers a notification)
      if (headerRefreshFn.current) {
        setTimeout(() => {
          headerRefreshFn.current?.refreshNotifications();
        }, 500);
      }
    } catch (error) {
      console.error('❌ Profile image upload failed:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
      });
      
      // Reset temp image on error so user can try again
      setTempImage(null);
      
      let errorMessage = 'Could not update profile picture.';
      if (error.response) {
        // Server responded with an error status
        const responseData = error.response.data;
        if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.errors) {
          const errors = responseData.errors;
          errorMessage = Object.values(errors).flat().join('\n');
        }
      } else if (error.message && (error.message.includes('Network') || error.message.includes('fetch'))) {
        // Network error (fetch API doesn't have error.code like axios)
        const serverURL = api.defaults.baseURL?.replace('/api', '') || 'the server';
        errorMessage = `Network error. Please check:\n\n1. Your internet connection\n2. Server is running at ${serverURL}\n3. Try again in a moment`;
      } else {
        // Unknown error
        errorMessage = error.message || 'Unknown error occurred. Please try again.';
      }
      
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setUploading(false);
    }
  };
  

  const getProfileImageUrl = () => {
    if (tempImage) return tempImage;
    if (profileImageUrl) return profileImageUrl;
    if (user?.profile_image) {
      // Use the base URL from the api utility
      const baseURL = api.defaults.baseURL;
      if (baseURL) {
        return `${baseURL.replace('/api', '')}/storage/${user.profile_image}`;
      }
    }
    return null;
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      console.log('🔍 Fetching appointments from /me/appointments...');
      const response = await api.get('/me/appointments');
      
      console.log('✅ Appointments API Response:', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        dataType: Array.isArray(response.data?.data) ? 'array' : typeof response.data?.data,
        dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'N/A',
        firstItem: response.data?.data?.[0],
      });
      
      // Handle different response formats
      let appointmentsData = [];
      if (response.data?.success && response.data?.data) {
        appointmentsData = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (Array.isArray(response.data)) {
        // Fallback: if response.data is directly an array
        appointmentsData = response.data;
      }
      
      console.log('📋 Processed appointments:', {
        count: appointmentsData.length,
        items: appointmentsData.map(apt => ({
          id: apt.id,
          service_type: apt.service_type,
          status: apt.display_status || apt.status,
          hasOrder: !!apt.order,
          orderStatus: apt.order?.status,
          orderHandled: apt.order?.handled,
          canCancel: apt.order ? (apt.order.handled === 0 || apt.order.handled === false || apt.order.handled === null || apt.order.handled === undefined) : false,
          hasRefundImage: !!apt.refund_image,
          refundImageUrl: apt.refund_image,
        })),
      });
      
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('❌ Failed to fetch appointments:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        fullUrl: error.config ? `${error.config.baseURL}${error.config.url}` : 'Unknown',
      });
      
      // Only show alert for non-network errors
      if (error.response && error.response.status !== 401) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to load appointments');
      } else if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
        console.warn('⚠️ Network error - appointments may not be available. Check if server is running.');
      }
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // Open appointments modal with animation
  const openAppointmentsModal = () => {
    setShowAppointmentsModal(true);
    fetchAppointments();
    Animated.timing(modalSlideAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  // Close appointments modal with animation
  const closeAppointmentsModal = () => {
    Animated.timing(modalSlideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowAppointmentsModal(false);
      setSearchQuery('');
      setFilterStatus('All');
      setSelectedAppointment(null);
      setShowOrderDetailsModal(false);
      setShowEditModal(false);
    });
  };

  // Normalize status for comparison
  const normalizeStatus = (status) => {
    if (!status) return 'Requesting';
    const normalized = status.toLowerCase();
    if (normalized === 'pending') return 'Requesting';
    if (normalized === 'accepted') return 'Accepted';
    if (normalized === 'rejected') return 'Rejected';
    // If already in display format, capitalize first letter
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Filter appointments
  const getFilteredAppointments = () => {
    if (!appointments || appointments.length === 0) {
      console.log('📊 No appointments to filter');
      return [];
    }

    let filtered = [...appointments];

    // Filter by status
    if (filterStatus !== 'All') {
      filtered = filtered.filter(apt => {
        const status = normalizeStatus(apt.display_status || apt.status || 'Requesting');
        return status === filterStatus;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => {
        const serviceType = apt.service_type || '';
        return serviceType.toLowerCase().includes(query);
      });
    }

    console.log('📊 Filtered appointments:', {
      total: appointments.length,
      filtered: filtered.length,
      filterStatus,
      searchQuery,
    });

    return filtered;
  };

  // Parse sizes to text
  const parseSizesToText = (sizes) => {
    try {
      if (!sizes) return '';
      if (typeof sizes === 'string') {
        sizes = JSON.parse(sizes);
      }
      if (Array.isArray(sizes)) {
        return sizes.join(', ');
      }
      if (typeof sizes === 'object') {
        return Object.entries(sizes)
          .filter(([, qty]) => Number(qty) > 0)
          .map(([size, qty]) => `${size} - ${qty} pcs.`)
          .join(', ');
      }
      return '';
    } catch (_) {
      return '';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (_) {
      return 'N/A';
    }
  };

  // Format time to 12-hour
  const formatTimeTo12Hour = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hourNum = parseInt(hours);
      const period = hourNum >= 12 ? 'PM' : 'AM';
      const hour12 = hourNum % 12 || 12;
      return `${hour12}:${minutes} ${period}`;
    } catch (_) {
      return 'N/A';
    }
  };

  // Open order details modal
  const openOrderDetails = (appointment) => {
    console.log('🔍 Opening order details for appointment:', {
      id: appointment?.id,
      hasRefundImage: !!appointment?.refund_image,
      refundImage: appointment?.refund_image,
      hasGcashProof: !!appointment?.gcash_proof,
      gcashProof: appointment?.gcash_proof,
      status: appointment?.status,
      displayStatus: appointment?.display_status,
      fullAppointment: appointment,
    });
    setSelectedAppointment(appointment);
    setShowOrderDetailsModal(true);
  };

  // Open image zoom modal
  const openImageZoom = (imageUri, title) => {
    setZoomedImageUri(imageUri);
    setZoomedImageTitle(title);
    setShowImageZoomModal(true);
  };

  // Open edit modal
  const openEditModal = (appointment) => {
    if (!appointment) {
      Alert.alert('Error', 'No appointment selected');
      return;
    }
    setSelectedAppointment(appointment);
    
    // Initialize appointment date (both formatted and raw)
    if (appointment.appointment_date) {
      try {
        const date = new Date(appointment.appointment_date);
        setEditAppointmentDate(format(date, 'MMMM d, yyyy'));
        setEditAppointmentDateRaw(format(date, 'yyyy-MM-dd'));
      } catch (e) {
        setEditAppointmentDate(appointment.appointment_date);
        setEditAppointmentDateRaw(appointment.appointment_date);
      }
    } else {
      setEditAppointmentDate('');
      setEditAppointmentDateRaw('');
    }
    
    // Initialize appointment time (both formatted and raw)
    if (appointment.appointment_time) {
      setEditAppointmentTimeRaw(appointment.appointment_time);
      setEditAppointmentTime(formatTimeTo12Hour(appointment.appointment_time));
    } else {
      setEditAppointmentTime('');
      setEditAppointmentTimeRaw('');
    }
    
    // Initialize due date (both formatted and raw)
    if (appointment.preferred_due_date) {
      try {
        const date = new Date(appointment.preferred_due_date);
        setEditDueDate(format(date, 'MMMM d, yyyy'));
        setEditDueDateRaw(format(date, 'yyyy-MM-dd'));
      } catch (e) {
        setEditDueDate(appointment.preferred_due_date);
        setEditDueDateRaw(appointment.preferred_due_date);
      }
    } else {
      setEditDueDate('');
      setEditDueDateRaw('');
    }
    
    // Set minimum date for due date picker (always today for new selections)
    const todayForDueDate = new Date();
    todayForDueDate.setHours(0, 0, 0, 0);
    setDueDatePickerMinimumDate(todayForDueDate);
    
    // Set minimum date for appointment date picker (always today for new selections)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setAppointmentDatePickerMinimumDate(today);
    
    setShowOrderDetailsModal(false);
    setShowEditModal(true);
  };

  // Load available time slots
  const loadAvailableSlots = async (date) => {
    if (!date) return;
    try {
      setLoadingAvailableSlots(true);
      
      // Validate date is not in the past
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        console.log("Selected date is in the past, clearing available slots");
        setAvailableSlots([]);
        return;
      }
      
      // Build URL with query parameters
      // Exclude the current appointment's time slot when editing
      let url = `/appointments/available-slots?date=${date}`;
      if (selectedAppointment?.order?.id) {
        // If appointment has an order, exclude that order's appointment
        url += `&exclude_order_id=${selectedAppointment.order.id}`;
      } else if (selectedAppointment?.id) {
        // If appointment doesn't have an order (pending), exclude the appointment directly
        url += `&exclude_appointment_id=${selectedAppointment.id}`;
      }
      const response = await api.get(url);
      if (response.data?.available_slots) {
        setAvailableSlots(response.data.available_slots);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Failed to load available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingAvailableSlots(false);
    }
  };

  // Handle date change for edit (use raw date format)
  useEffect(() => {
    if (editAppointmentDateRaw && showEditModal && selectedAppointment) {
      loadAvailableSlots(editAppointmentDateRaw);
    }
  }, [editAppointmentDateRaw, showEditModal]);

  // Date picker handlers
  const showAppointmentDatePicker = () => setAppointmentDatePickerVisibility(true);
  const hideAppointmentDatePicker = () => setAppointmentDatePickerVisibility(false);
  const handleAppointmentDateConfirm = (date) => {
    setEditAppointmentDate(format(date, 'MMMM d, yyyy'));
    setEditAppointmentDateRaw(format(date, 'yyyy-MM-dd'));
    setEditAppointmentTime('');
    setEditAppointmentTimeRaw('');
    hideAppointmentDatePicker();
  };

  const showDueDatePicker = () => setDueDatePickerVisibility(true);
  const hideDueDatePicker = () => setDueDatePickerVisibility(false);
  const handleDueDateConfirm = (date) => {
    setEditDueDate(format(date, 'MMMM d, yyyy'));
    setEditDueDateRaw(format(date, 'yyyy-MM-dd'));
    hideDueDatePicker();
  };

  // Time picker handlers
  const showAppointmentTimePicker = () => setShowTimeDropdown(!showTimeDropdown);
  const handleTimeSelect = (time) => {
    setEditAppointmentTime(formatTimeTo12Hour(time));
    setEditAppointmentTimeRaw(time);
    setShowTimeDropdown(false);
  };

  // Submit edit
  const handleEditSubmit = async () => {
    if (!selectedAppointment) {
      Alert.alert('Error', 'No appointment selected');
      return;
    }

    if (!editAppointmentDateRaw || !editAppointmentTimeRaw || !editDueDateRaw) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setEditSubmitting(true);
      
      // Check if appointment has an order or not
      // If it has an order, use the order update endpoint
      // If it doesn't have an order (pending appointment), use the appointment update endpoint
      let response;
      if (selectedAppointment.order) {
        // Appointment has an order - use order update endpoint
        response = await api.patch('/appointments/update-order-details', {
          order_id: selectedAppointment.order.id,
          appointment_date: editAppointmentDateRaw,
          appointment_time: editAppointmentTimeRaw,
          preferred_due_date: editDueDateRaw,
        });
      } else {
        // Appointment doesn't have an order (pending) - use appointment update endpoint
        response = await api.patch('/appointments/update-appointment-details', {
          appointment_id: selectedAppointment.id,
          appointment_date: editAppointmentDateRaw,
          appointment_time: editAppointmentTimeRaw,
          preferred_due_date: editDueDateRaw,
        });
      }

      if (response.data?.success) {
        Alert.alert('Success', 'Appointment updated successfully');
        setShowEditModal(false);
        fetchAppointments(); // Refresh appointments
        // Refresh notifications in header to update badge count
        if (headerRefreshFn.current) {
          // Add a small delay to ensure the backend has processed the notification
          setTimeout(() => {
            headerRefreshFn.current?.refreshNotifications();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to update appointment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update appointment');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle cancel appointment
  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) {
      console.log('❌ No appointment to cancel');
      return;
    }

    console.log('🗑️ Cancelling appointment:', {
      appointmentId: appointmentToCancel.id,
      orderId: appointmentToCancel.order?.id,
      orderStatus: appointmentToCancel.order?.status,
      handled: appointmentToCancel.order?.handled,
    });

    try {
      const response = await api.delete(`/appointments/${appointmentToCancel.id}/cancel`);
      console.log('✅ Cancel response:', response.data);
      
      if (response.data?.success) {
        setShowCancelConfirmation(false);
        setShowCancelSuccess(true);
        // Refresh notifications in header to update badge count (will show the cancellation notification)
        if (headerRefreshFn.current) {
          // Add a small delay to ensure the backend has processed any notifications
          setTimeout(() => {
            headerRefreshFn.current?.refreshNotifications();
          }, 1000);
        }
        setTimeout(() => {
          setShowCancelSuccess(false);
          setAppointmentToCancel(null);
          fetchAppointments(); // Refresh appointments (cancelled appointment will be removed)
          setShowOrderDetailsModal(false);
        }, 2000); // Increased to 2 seconds to show the success message
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to cancel appointment');
        setShowCancelConfirmation(false);
        setAppointmentToCancel(null);
      }
    } catch (error) {
      console.error('❌ Failed to cancel appointment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      Alert.alert('Error', error.response?.data?.message || 'Failed to cancel appointment');
      setShowCancelConfirmation(false);
      setAppointmentToCancel(null);
    }
  };

  // Check if edit button should be visible
  const shouldShowEditButton = (appointment) => {
    if (!appointment) {
      return false;
    }

    const appointmentStatus = appointment.status || '';
    const displayStatus = normalizeStatus(appointment.display_status || appointment.status || 'Requesting');

    // Condition 1: When Filter is "Requesting" (appointment.status === 'pending')
    // Allow editing even without an order (pending appointments waiting for admin approval)
    const isRequesting = appointmentStatus === 'pending' || displayStatus === 'Requesting';
    if (isRequesting) {
      return true; // Always allow editing for pending/requesting appointments
    }

    // Condition 2: If appointment has an order, hide edit button only when order status is "Finished"
    if (appointment.order) {
      const orderStatus = appointment.order.status;
      // Hide edit button only when order status is "Finished"
      if (orderStatus === 'Finished') {
        return false;
      }
      // For all other order statuses (Pending, Ready to Check, Completed), show edit button
      return true;
    }

    // Condition 3: If appointment doesn't have an order and is not "Requesting", don't show edit button
    // (This handles rejected appointments or other edge cases)
    return false;
  };

  // Check if cancel button should be visible
  const shouldShowCancelButton = (appointment) => {
    if (!appointment) {
      return false;
    }

    const appointmentStatus = appointment.status || '';
    const displayStatus = normalizeStatus(appointment.display_status || appointment.status || 'Requesting');

    // Condition 1: When Filter is "Requesting" (appointment.status === 'pending')
    // Allow canceling even without an order (pending appointments waiting for admin approval)
    const isRequesting = appointmentStatus === 'pending' || displayStatus === 'Requesting';
    if (isRequesting) {
      return true; // Always allow canceling for pending/requesting appointments
    }

    // Condition 2: When Filter is "Accepted" (appointment.status === 'accepted')
    // Must have an order to cancel accepted appointments
    if (!appointment.order) {
      return false;
    }

    const orderStatus = appointment.order.status;
    const handled = appointment.order.handled;

    // CRITICAL: Hide cancel button if Order status is "Pending" AND handled is 1 (true)
    // This means admin and client have already had their first meetup
    if (orderStatus === 'Pending' && (handled === 1 || handled === true || handled === '1')) {
      return false;
    }

    // Check if handled is not 1 (0, false, null, undefined means not triggered)
    const isNotHandled = handled === 0 || handled === false || handled === null || handled === undefined;

    // For accepted appointments: Order status must be 'Pending' AND Handled column is not 1
    const isAcceptedWithPendingOrderNotHandled = 
      (appointmentStatus === 'accepted' || displayStatus === 'Accepted') &&
      orderStatus === 'Pending' &&
      isNotHandled;

    return isAcceptedWithPendingOrderNotHandled;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Requesting':
        return '#FFA500';
      case 'Accepted':
        return '#4CAF50';
      case 'Rejected':
        return '#f44336';
      default:
        return '#666';
    }
  };

  // Get order status color
  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#FFA500';
      case 'Ready to Check':
        return '#e91e63';
      case 'Completed':
        return '#4CAF50';
      case 'Finished':
        return '#2196f3';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4682B4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <Header onRef={(fn) => { headerRefreshFn.current = fn; }} userName={user?.name || "User"} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>My Profile</Text>

        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            {uploading ? (
              <View style={styles.profileImagePlaceholder}>
                <ActivityIndicator size="large" color="#4682B4" />
              </View>
            ) : tempImage ? (
              <Image source={{ uri: tempImage }} style={styles.profileImage} />
            ) : getProfileImageUrl() ? (
              <Image 
              source={{ uri: getProfileImageUrl() }} 
              style={styles.profileImage}
              onError={(error) => console.log('Image loading error:', error)}
            />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialIcons name="account-circle" size={80} color="#4682B4" />
              </View>
            )}
            <View style={styles.editIcon}>
              <MaterialIcons name="edit" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[styles.input, isEditing && styles.inputEditing]}
            value={isEditing ? form.name : user?.name}
            editable={isEditing}
            onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, isEditing && styles.inputEditing]}
            value={isEditing ? form.email : user?.email}
            editable={isEditing}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, isEditing && styles.inputEditing]}
            value={isEditing ? form.phone : user?.phone}
            editable={isEditing}
            keyboardType="phone-pad"
            onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, isEditing && styles.inputEditing]}
            value={isEditing ? form.address : user?.address}
            editable={isEditing}
            onChangeText={(t) => setForm((p) => ({ ...p, address: t }))}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, isEditing && styles.inputEditing]}
            value={isEditing ? form.password : '********'}
            secureTextEntry
            editable={isEditing}
            onChangeText={(t) => setForm((p) => ({ ...p, password: t }))}
            placeholder={isEditing ? 'Leave blank to keep current password' : undefined}
          />
        </View>

        <View style={styles.buttonContainer}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.editButton} onPress={saveProfile}>
                <Text style={styles.buttonText}>SAVE CHANGES</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setIsEditing(false); setForm((p) => ({...p, password: ''})); }}>
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.buttonText}>EDIT PROFILE</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.myAppointmentsButton} onPress={openAppointmentsModal}>
            <Text style={styles.buttonText}>MY APPOINTMENTS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.buttonText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        transparent={true}
        visible={showSuccessModal}
        animationType="none"
        onRequestClose={hideSuccessMessage}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.successModal, { opacity: fadeAnim }]}>
            <MaterialIcons name="check-circle" size={50} color="#4CAF50" />
            <Text style={styles.successText}>Profile Updated Successfully!</Text>
          </Animated.View>
        </View>
      </Modal>

      {/* My Appointments Modal */}
      <Modal
        visible={showAppointmentsModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeAppointmentsModal}
      >
        <TouchableOpacity 
          style={styles.appointmentsModalBackdrop}
          activeOpacity={1}
          onPress={() => {
            if (showFilterDropdown) {
              setShowFilterDropdown(false);
            } else {
              closeAppointmentsModal();
            }
          }}
        >
          <Animated.View 
            style={[
              styles.appointmentsModalContent,
              {
                transform: [{
                  translateY: modalSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                }],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={styles.appointmentsModalHeader}>
              <Text style={styles.appointmentsModalTitle}>My Appointments</Text>
              <TouchableOpacity onPress={closeAppointmentsModal}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Search and Filter */}
            <View style={styles.searchFilterContainer}>
              <View style={styles.searchBarContainer}>
                <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchBar}
                  placeholder="Search by service type"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.filterContainer}>
                <TouchableOpacity 
                  style={styles.filterButton}
                  onPress={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <MaterialIcons name="filter-list" size={20} color="#4682B4" />
                </TouchableOpacity>
                {showFilterDropdown && (
                  <>
                    <TouchableOpacity 
                      style={styles.filterDropdownOverlay}
                      activeOpacity={1}
                      onPress={() => setShowFilterDropdown(false)}
                    />
                    <View style={styles.filterDropdown}>
                      {['All', 'Requesting', 'Accepted', 'Rejected'].map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.filterItem,
                            filterStatus === status && styles.filterItemActive,
                          ]}
                          onPress={() => {
                            setFilterStatus(status);
                            setShowFilterDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.filterItemText,
                              filterStatus === status && styles.filterItemTextActive,
                            ]}
                          >
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Appointments List */}
            <ScrollView 
              style={styles.appointmentsList} 
              contentContainerStyle={[
                styles.appointmentsListContent,
                getFilteredAppointments().length === 0 && { flexGrow: 1, justifyContent: 'center' }
              ]}
              showsVerticalScrollIndicator={false}
            >
              {appointmentsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4682B4" />
                  <Text style={styles.loadingText}>Loading appointments...</Text>
                </View>
              ) : getFilteredAppointments().length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="event-busy" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {appointments.length === 0
                      ? 'No appointments found'
                      : `No appointments match "${searchQuery}"${filterStatus !== 'All' ? ` (${filterStatus})` : ''}`}
                  </Text>
                  {appointments.length === 0 && (
                    <Text style={styles.emptySubtext}>
                      Book an appointment to see it here
                    </Text>
                  )}
                </View>
              ) : (
                getFilteredAppointments().map((appointment) => (
                  <TouchableOpacity
                    key={appointment.id}
                    style={styles.appointmentCard}
                    onPress={() => openOrderDetails(appointment)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.appointmentCardHeader}>
                      <View style={styles.appointmentCardHeaderLeft}>
                        <Text style={styles.appointmentServiceType}>
                          {appointment.service_type || 'N/A'}
                        </Text>
                        {appointment.order?.queue_number && (
                          <Text style={styles.queueNumberText}>
                            Queue #{appointment.order.queue_number}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(appointment.display_status || appointment.status || 'Requesting') + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: getStatusColor(appointment.display_status || appointment.status || 'Requesting') },
                          ]}
                        >
                          {appointment.display_status || appointment.status || 'Requesting'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.appointmentCardBody}>
                      <View style={styles.appointmentDetailRow}>
                        <MaterialIcons name="event" size={16} color="#666" />
                        <Text style={styles.appointmentDetailText}>
                          {appointment.appointment_date && appointment.appointment_time
                            ? `${formatDate(appointment.appointment_date)} at ${formatTimeTo12Hour(appointment.appointment_time)}`
                            : 'Date not set'}
                        </Text>
                      </View>
                      
                      {appointment.total_quantity && (
                        <View style={styles.appointmentDetailRow}>
                          <MaterialIcons name="inventory" size={16} color="#666" />
                          <Text style={styles.appointmentDetailText}>
                            Quantity: {appointment.total_quantity} pcs.
                          </Text>
                        </View>
                      )}
                      
                      {appointment.preferred_due_date && (
                        <View style={styles.appointmentDetailRow}>
                          <MaterialIcons name="schedule" size={16} color="#666" />
                          <Text style={styles.appointmentDetailText}>
                            Due: {formatDate(appointment.preferred_due_date)}
                          </Text>
                        </View>
                      )}
                      
                      {appointment.order ? (
                        <View style={styles.appointmentDetailRow}>
                          <MaterialIcons name="shopping-cart" size={16} color={getOrderStatusColor(appointment.order.status)} />
                          <Text style={styles.appointmentDetailText}>
                            Order Status: <Text style={{ color: getOrderStatusColor(appointment.order.status), fontWeight: '600' }}>
                              {appointment.order.status}
                            </Text>
                          </Text>
                        </View>
                      ) : (() => {
                        const status = normalizeStatus(appointment.display_status || appointment.status || 'Requesting');
                        if (status === 'Requesting') {
                          return (
                            <View style={styles.appointmentDetailRow}>
                              <MaterialIcons name="hourglass-empty" size={16} color="#FFA500" />
                              <Text style={styles.appointmentDetailText}>
                                Waiting for admin approval
                              </Text>
                            </View>
                          );
                        } else if (status === 'Rejected') {
                          return (
                            <View style={styles.appointmentDetailRow}>
                              <MaterialIcons name="cancel" size={16} color="#f44336" />
                              <Text style={styles.appointmentDetailText}>
                                Appointment rejected
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                    
                    <View style={styles.appointmentCardFooter}>
                      <Text style={styles.viewDetailsText}>Tap to view details</Text>
                      <MaterialIcons name="chevron-right" size={20} color="#4682B4" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Order Details Modal */}
      <Modal
        visible={showOrderDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOrderDetailsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.orderDetailsModal}>
            <View style={styles.orderDetailsHeader}>
              <Text style={styles.orderDetailsTitle}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setShowOrderDetailsModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.orderDetailsContent}
              contentContainerStyle={styles.orderDetailsContentContainer}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {selectedAppointment && (
                <>
                  {/* Admin Refund Image - Display at top if refund image exists */}
                  {(() => {
                    // Check for refund_image in multiple possible locations
                    const refundImage = selectedAppointment.refund_image || 
                                      selectedAppointment.order?.refund_image ||
                                      null;
                    const hasRefundImage = refundImage && 
                                         typeof refundImage === 'string' && 
                                         refundImage.trim() !== '' &&
                                         refundImage !== 'null' &&
                                         refundImage !== 'undefined';
                    
                    console.log('🖼️ Rendering refund image section:', {
                      hasRefundImage,
                      refundImage: refundImage,
                      refundImageType: typeof refundImage,
                      status: selectedAppointment.status,
                      displayStatus: selectedAppointment.display_status,
                      isRejected: selectedAppointment.status === 'rejected' || selectedAppointment.display_status === 'Rejected',
                      selectedAppointmentKeys: Object.keys(selectedAppointment),
                    });
                    
                    if (hasRefundImage) {
                      // Backend returns full URL via asset(), so use it directly (same as gcash_proof)
                      const imageUrl = refundImage;
                      
                      console.log('🖼️ Displaying refund image:', {
                        imageUrl: imageUrl,
                        isFullUrl: imageUrl.startsWith('http'),
                      });
                      
                      return (
                        <View style={styles.detailSection}>
                          <Text style={[styles.detailSectionTitle, { fontSize: 18, fontWeight: 'bold', color: '#f44336', marginBottom: 12 }]}>
                            💰 Admin Refund Proof
                          </Text>
                          <View style={styles.imageContainer}>
                            <Text style={styles.imageLabel}>GCash Refund Proof</Text>
                            <TouchableOpacity
                              style={styles.imageWrapper}
                              onPress={() => openImageZoom(imageUrl, 'GCash Refund Proof')}
                              activeOpacity={0.8}
                            >
                              <Image
                                source={{ uri: imageUrl }}
                                style={styles.thumbnailImage}
                                resizeMode="cover"
                                onLoad={() => {
                                  console.log('✅ Refund image loaded successfully:', imageUrl);
                                }}
                                onLoadStart={() => {
                                  console.log('🔄 Refund image loading started:', imageUrl);
                                }}
                                onError={(error) => {
                                  console.error('❌ Failed to load refund image:', {
                                    error: error.nativeEvent?.error || error,
                                    imageUrl: imageUrl,
                                  });
                                }}
                              />
                              <View style={styles.imageOverlay}>
                                <MaterialIcons name="zoom-in" size={24} color="#fff" />
                                <Text style={styles.imageOverlayText}>Tap to zoom</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    } else {
                      // Show debug info if refund should exist but doesn't
                      if (selectedAppointment.status === 'rejected' || selectedAppointment.display_status === 'Rejected') {
                        console.warn('⚠️ Rejected appointment but no refund_image found:', {
                          appointmentId: selectedAppointment.id,
                          status: selectedAppointment.status,
                          displayStatus: selectedAppointment.display_status,
                          refundImage: selectedAppointment.refund_image,
                        });
                      }
                    }
                    return null;
                  })()}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Appointment Information</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          { color: getStatusColor(normalizeStatus(selectedAppointment.display_status || selectedAppointment.status || 'Requesting')), fontWeight: '600' },
                        ]}
                      >
                        {normalizeStatus(selectedAppointment.display_status || selectedAppointment.status || 'Requesting')}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Appointment Date:</Text>
                      <Text style={styles.detailValue}>
                        {selectedAppointment.appointment_date
                          ? formatDate(selectedAppointment.appointment_date)
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Appointment Time:</Text>
                      <Text style={styles.detailValue}>
                        {selectedAppointment.appointment_time
                          ? formatTimeTo12Hour(selectedAppointment.appointment_time)
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Due Date:</Text>
                      <Text style={styles.detailValue}>
                        {selectedAppointment.preferred_due_date
                          ? formatDate(selectedAppointment.preferred_due_date)
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Order Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service Type:</Text>
                      <Text style={styles.detailValue}>{selectedAppointment.service_type || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Size:</Text>
                      <Text style={styles.detailValue}>{parseSizesToText(selectedAppointment.sizes) || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Quantity:</Text>
                      <Text style={styles.detailValue}>{selectedAppointment.total_quantity || 0} pcs.</Text>
                    </View>
                    {selectedAppointment.order ? (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Order Status:</Text>
                          <Text
                            style={[
                              styles.detailValue,
                              { color: getOrderStatusColor(selectedAppointment.order.status), fontWeight: '600' },
                            ]}
                          >
                            {selectedAppointment.order.status}
                          </Text>
                        </View>
                        {selectedAppointment.order.total_amount && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Total Amount:</Text>
                            <Text style={[styles.detailValue, { fontWeight: '600', color: '#4CAF50' }]}>
                              ₱{selectedAppointment.order.total_amount}
                            </Text>
                          </View>
                        )}
                        {selectedAppointment.order.check_appointment_date && selectedAppointment.order.check_appointment_time && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Check Appointment:</Text>
                            <Text style={styles.detailValue}>
                              {formatDate(selectedAppointment.order.check_appointment_date)} at {formatTimeTo12Hour(selectedAppointment.order.check_appointment_time)}
                            </Text>
                          </View>
                        )}
                        {selectedAppointment.order.pickup_appointment_date && selectedAppointment.order.pickup_appointment_time && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Pickup Appointment:</Text>
                            <Text style={styles.detailValue}>
                              {formatDate(selectedAppointment.order.pickup_appointment_date)} at {formatTimeTo12Hour(selectedAppointment.order.pickup_appointment_time)}
                            </Text>
                          </View>
                        )}
                        {selectedAppointment.order.completed_at && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Completed At:</Text>
                            <Text style={styles.detailValue}>
                              {formatDate(selectedAppointment.order.completed_at)}
                            </Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailValue}>
                          {(() => {
                            const status = normalizeStatus(selectedAppointment.display_status || selectedAppointment.status || 'Requesting');
                            if (status === 'Rejected') {
                              return 'This appointment was rejected. No order was created.';
                            } else if (status === 'Requesting') {
                              return 'Waiting for admin approval. No order created yet.';
                            } else {
                              return 'No order created yet.';
                            }
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {selectedAppointment.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Notes</Text>
                      <Text style={styles.detailNotesText}>{selectedAppointment.notes}</Text>
                    </View>
                  )}

                  {/* Design Image and GCash Image Section */}
                  {(selectedAppointment.design_image || selectedAppointment.gcash_proof) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Images</Text>
                      
                      {selectedAppointment.design_image && (
                        <View style={styles.imageContainer}>
                          <Text style={styles.imageLabel}>Design Image</Text>
                          <TouchableOpacity
                            style={styles.imageWrapper}
                            onPress={() => openImageZoom(selectedAppointment.design_image, 'Design Image')}
                            activeOpacity={0.8}
                          >
                            <Image
                              source={{ uri: selectedAppointment.design_image }}
                              style={styles.thumbnailImage}
                              resizeMode="cover"
                            />
                            <View style={styles.imageOverlay}>
                              <MaterialIcons name="zoom-in" size={24} color="#fff" />
                              <Text style={styles.imageOverlayText}>Tap to zoom</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}

                      {selectedAppointment.gcash_proof && (
                        <View style={styles.imageContainer}>
                          <Text style={styles.imageLabel}>GCash Proof</Text>
                          <TouchableOpacity
                            style={styles.imageWrapper}
                            onPress={() => openImageZoom(selectedAppointment.gcash_proof, 'GCash Proof')}
                            activeOpacity={0.8}
                          >
                            <Image
                              source={{ uri: selectedAppointment.gcash_proof }}
                              style={styles.thumbnailImage}
                              resizeMode="cover"
                            />
                            <View style={styles.imageOverlay}>
                              <MaterialIcons name="zoom-in" size={24} color="#fff" />
                              <Text style={styles.imageOverlayText}>Tap to zoom</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            {(shouldShowEditButton(selectedAppointment) || shouldShowCancelButton(selectedAppointment)) && (
              <View style={styles.orderDetailsFooter}>
                {shouldShowEditButton(selectedAppointment) && (
                  <TouchableOpacity
                    style={styles.editDetailsButton}
                    onPress={() => openEditModal(selectedAppointment)}
                  >
                    <Text style={styles.editDetailsButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}
                {shouldShowCancelButton(selectedAppointment) && (
                  <TouchableOpacity
                    style={styles.cancelDetailsButton}
                    onPress={() => {
                      setAppointmentToCancel(selectedAppointment);
                      setShowCancelConfirmation(true);
                    }}
                  >
                    <Text style={styles.cancelDetailsButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowEditModal(false);
          setShowTimeDropdown(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editModal}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Appointment</Text>
              <TouchableOpacity onPress={() => {
                setShowEditModal(false);
                setShowTimeDropdown(false);
              }}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.editModalContent}>
              <Text style={styles.editLabel}>📅 Select Available Date and Time</Text>
              <TouchableOpacity onPress={showAppointmentDatePicker} style={styles.editInputField}>
                <Text style={{ color: editAppointmentDate ? '#000' : '#aaa', fontSize: 17 }}>
                  {editAppointmentDate || 'Pick appointment date'}
                </Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={isAppointmentDatePickerVisible}
                mode="date"
                onConfirm={handleAppointmentDateConfirm}
                onCancel={hideAppointmentDatePicker}
                minimumDate={appointmentDatePickerMinimumDate}
                date={editAppointmentDateRaw ? new Date(editAppointmentDateRaw) : new Date()}
              />

              {editAppointmentDate && (
                <>
                  <Text style={[styles.editLabel, { fontSize: 17, marginTop: 12 }]}>Select Time</Text>
                  <TouchableOpacity style={styles.editInputRow} onPress={showAppointmentTimePicker}>
                    <MaterialIcons name="schedule" size={24} color="#4682B4" style={{ marginRight: 10 }} />
                    <Text style={{ flex: 1, color: editAppointmentTime ? '#000' : '#aaa', fontSize: 17 }}>
                      {editAppointmentTime || 'Select time...'}
                    </Text>
                    <MaterialIcons
                      name={showTimeDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={24}
                      color="#222"
                    />
                  </TouchableOpacity>

                  {showTimeDropdown && (
                    <View style={styles.editDropdownMenu}>
                      {generateTimeSlots().map((time) => {
                        const isAvailable = availableSlots.includes(time);
                        return (
                          <TouchableOpacity
                            key={time}
                            style={[
                              styles.editDropdownItem,
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
                              {formatTimeTo12Hour(time)}
                              {!isAvailable && ' (Not Available)'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  {loadingAvailableSlots && (
                    <ActivityIndicator size="small" color="#4682B4" style={{ marginTop: 8 }} />
                  )}
                </>
              )}

              <Text style={[styles.editLabel, { fontSize: 18, marginTop: 20 }]}>📅 Preferred Due Date</Text>
              <Text style={[styles.editHelperText, { fontSize: 15 }]}>When do you want it finished?</Text>
              <TouchableOpacity onPress={showDueDatePicker} style={styles.editInputField}>
                <Text style={{ color: editDueDate ? '#000' : '#aaa', fontSize: 17 }}>
                  {editDueDate || 'Pick a date'}
                </Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={isDueDatePickerVisible}
                mode="date"
                onConfirm={handleDueDateConfirm}
                onCancel={hideDueDatePicker}
                minimumDate={dueDatePickerMinimumDate}
                date={editDueDateRaw ? new Date(editDueDateRaw) : new Date()}
              />
            </ScrollView>
            <View style={styles.editModalFooter}>
              <TouchableOpacity
                style={styles.editSubmitButton}
                onPress={handleEditSubmit}
                disabled={editSubmitting}
              >
                <Text style={styles.editSubmitButtonText}>
                  {editSubmitting ? 'Submitting...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelConfirmation(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationModal}>
            <Text style={styles.confirmationTitle}>Are you sure you want to Cancel this order?</Text>
            <Text style={styles.confirmationMessage}>
              If you choose yes, this order will be permanently deleted from the system
            </Text>
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={styles.confirmationNoButton}
                onPress={() => {
                  setShowCancelConfirmation(false);
                  setAppointmentToCancel(null);
                }}
              >
                <Text style={styles.confirmationNoButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmationYesButton}
                onPress={handleCancelAppointment}
              >
                <Text style={styles.confirmationYesButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Success Modal */}
      {showCancelSuccess && (
        <Modal
          visible={showCancelSuccess}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCancelSuccess(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.cancelSuccessModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>You have successfully cancelled an order!</Text>
                <TouchableOpacity onPress={() => setShowCancelSuccess(false)}>
                  <MaterialIcons name="close" size={22} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Image Zoom Modal */}
      <Modal
        visible={showImageZoomModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageZoomModal(false)}
      >
        <View style={styles.imageZoomBackdrop}>
          <TouchableOpacity
            style={styles.imageZoomCloseButton}
            onPress={() => setShowImageZoomModal(false)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.imageZoomContainer}>
            <Text style={styles.imageZoomTitle}>{zoomedImageTitle}</Text>
            <ScrollView
              contentContainerStyle={styles.imageZoomScrollContent}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              bounces={true}
            >
              {zoomedImageUri && (
                <Image
                  source={{ uri: zoomedImageUri }}
                  style={styles.zoomedImage}
                  resizeMode="contain"
                />
              )}
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingTop: 10,
    padding: 15,
    paddingBottom: 30,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    alignSelf: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4682B4',
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  inputEditing: {
    borderColor: '#4682B4',
    backgroundColor: '#fff',
    shadowColor: '#4682B4',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContainer: {
    marginTop: 20,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#4682B4',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4682B4',
  },
  cancelButtonText: {
    color: '#4682B4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  myAppointmentsButton: {
    backgroundColor: '#5a9bd4',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#4682B4',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#4682B4',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  successModal: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  successText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  // My Appointments Modal Styles
  appointmentsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  appointmentsModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'column',
  },
  appointmentsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  appointmentsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  filterContainer: {
    position: 'relative',
    zIndex: 100,
  },
  filterButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 999,
  },
  filterDropdown: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    minWidth: 120,
  },
  filterItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterItemActive: {
    backgroundColor: '#e3f2fd',
  },
  filterItemText: {
    fontSize: 14,
    color: '#000',
  },
  filterItemTextActive: {
    color: '#4682B4',
    fontWeight: 'bold',
  },
  appointmentsList: {
    flex: 1,
    minHeight: 200,
  },
  appointmentsListContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentCardHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  appointmentServiceType: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  queueNumberText: {
    fontSize: 12,
    color: '#4682B4',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentCardBody: {
    marginBottom: 10,
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  appointmentDetailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  appointmentCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#4682B4',
    fontWeight: '500',
  },
  // Order Details Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderDetailsModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '85%',
    padding: 20,
    overflow: 'hidden',
  },
  orderDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    flexShrink: 0,
  },
  orderDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  orderDetailsContent: {
    marginBottom: 15,
    maxHeight: Dimensions.get('window').height * 0.55,
  },
  orderDetailsContentContainer: {
    paddingBottom: 20,
  },
  detailSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
    textAlign: 'right',
  },
  detailNotesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  orderDetailsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
    flexShrink: 0,
  },
  editDetailsButton: {
    backgroundColor: '#4682B4',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  editDetailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelDetailsButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  cancelDetailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Edit Modal Styles
  editModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  editModalContent: {
    maxHeight: 400,
  },
  editInputGroup: {
    marginBottom: 15,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
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
  },
  editDropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unavailableSlot: {
    backgroundColor: '#f8f8f8',
    opacity: 0.7,
  },
  editHelperText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  editModalFooter: {
    marginTop: 15,
  },
  editSubmitButton: {
    backgroundColor: '#4682B4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editSubmitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Confirmation Modal Styles
  confirmationModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '85%',
    padding: 20,
    alignItems: 'center',
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmationMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmationNoButton: {
    flex: 1,
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmationNoButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmationYesButton: {
    flex: 1,
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmationYesButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Cancel Success Modal
  cancelSuccessModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '85%',
    padding: 20,
  },
  // Image Display Styles
  imageContainer: {
    marginBottom: 20,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  thumbnailImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Image Zoom Modal Styles
  imageZoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageZoomCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  imageZoomContainer: {
    flex: 1,
    width: '100%',
    paddingTop: 80,
    paddingBottom: 20,
  },
  imageZoomTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  imageZoomScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  zoomedImage: {
    width: '100%',
    minHeight: 400,
    maxWidth: '100%',
  },
});