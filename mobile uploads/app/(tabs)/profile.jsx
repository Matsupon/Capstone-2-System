import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import mime from 'mime';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';

const API = process.env.EXPO_PUBLIC_API_URL;

export default function ProfilePage() {
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
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API}/user`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      
      setUser(response.data.user);
      setProfileImageUrl(response.data.user.image_url); 

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
      const token = await AsyncStorage.getItem('authToken');
      const formData = new FormData();
      if (form.name) formData.append('name', form.name);
      if (form.email) formData.append('email', form.email);
      if (form.phone) formData.append('phone', form.phone);
      if (form.address) formData.append('address', form.address);
      if (form.password) formData.append('password', form.password);

      const response = await axios.post(`${API}/profile`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      setUser(response.data.user);
      setProfileImageUrl(response.data.image_url);
      setIsEditing(false);
      showSuccessMessage();
    } catch (error) {
      console.error('Profile save failed:', error.response?.data || error.message);
      Alert.alert('Update Failed', error.response?.data?.message || 'Could not update profile.');
    }
  };

  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      await axios.post(`${API}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await AsyncStorage.removeItem('authToken');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      await AsyncStorage.removeItem('authToken');
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
      const token = await AsyncStorage.getItem('authToken');
  
      const formData = new FormData();
      const fileType = mime.getType(uri);
      const fileName = `profile_${user.id}_${Date.now()}.${mime.getExtension(fileType)}`;
  
      formData.append('profile_image', {
        uri,
        name: fileName,
        type: fileType,
      });
  
      console.log('📦 FormData content:', { uri, name: fileName, type: fileType });
  
      const response = await axios.post(`${API}/profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
  
      setUser(response.data.user);
      setProfileImageUrl(response.data.image_url); 
      setTempImage(null);
      showSuccessMessage();
    } catch (error) {
      console.error('Upload failed:', error.response?.data || error.message);
      Alert.alert('Upload Failed', error.response?.data?.message || 'Could not update profile picture.');
    } finally {
      setUploading(false);
    }
  };
  

  const getProfileImageUrl = () => {
    if (tempImage) return tempImage;
    if (profileImageUrl) return profileImageUrl;
    if (user?.profile_image) return `${API}/storage/${user.profile_image}`;
    return null;
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
      <Header userName={user?.name || "User"} />

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
                <MaterialIcons name="account-circle" size={100} color="#4682B4" />
              </View>
            )}
            <View style={styles.editIcon}>
              <MaterialIcons name="edit" size={20} color="#fff" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingTop: 20,
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    alignSelf: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4682B4',
    borderRadius: 20,
    padding: 4,
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
    marginBottom: 20,
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
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
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
    marginTop: 30,
    gap: 10,
  },
  editButton: {
    backgroundColor: '#4682B4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4682B4',
  },
  cancelButtonText: {
    color: '#4682B4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#4682B4',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
});