import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Header from '../../components/Header';

export default function AppointmentsPage() {
  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <Header userName="Dianne" />
      <View style={styles.content}>
        <Text style={styles.text}>Appointments page coming soon!</Text>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    color: '#687076',
  },
}); 