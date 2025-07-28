import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../../utils/api';



export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await api.post('/login', {
        email,
        password,
      });
  
      // Save the token
      await AsyncStorage.setItem('authToken', response.data.access_token);
  
      console.log('Login success:', response.data);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      alert('Invalid credentials or server error.');
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

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>LOGIN</Text>
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
