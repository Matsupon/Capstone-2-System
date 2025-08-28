import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../../utils/api';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Added loading state
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    setLoading(true); // Start loading
    try {
      const response = await api.post('/login', {
        email,
        password,
      });
  
      const token = response.data.access_token;
  
      if (token) {
        // Use consistent token key 'token' instead of 'authToken'
        await AsyncStorage.setItem('authToken', token);
        console.log('Login successful, token saved:', token);
  
        router.replace('/(tabs)'); // Redirect to tabs/index.jsx
      } else {
        console.error('Token not received from backend:', response.data);
        alert('Login failed. No token received from server.');
      }
  
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      alert(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false); // End loading regardless of success/error
    }
  };

  return (
    <LinearGradient
      colors={['#e0f4ff', '#b3e5fc']}
      style={styles.container}
    >
      <Image 
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
      />
      
      <Text style={styles.title}>Jun Tailoring{'\n'}Appointment System</Text>
      
      <Text style={styles.subtitle}>Welcome Back!</Text>
      <Text style={styles.description}>Login into your account below.</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <MaterialIcons name="email" size={20} color="#687076" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            placeholderTextColor="#687076"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons name="lock" size={20} color="#687076" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#687076"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons 
              name={showPassword ? "eye-off" : "eye"} 
              size={20} 
              color="#687076" 
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleLogin}
          disabled={loading} // Disable button during loading
        >
          {loading ? (
            <ActivityIndicator color="#fff" /> // Show spinner when loading
          ) : (
            <Text style={styles.loginButtonText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account yet? </Text>
          <Link href="/auth/signup" style={styles.signupLink}>SIGNUP</Link>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#687076',
    marginBottom: 30,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#000',
  },
  eyeIcon: {
    padding: 5,
  },
  loginButton: {
    backgroundColor: '#4682B4',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#687076',
  },
  signupLink: {
    color: '#4682B4',
    fontWeight: 'bold',
  },
});