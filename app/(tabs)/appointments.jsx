import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';

export default function AppointmentsPage() {
  const [expandedRecent, setExpandedRecent] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState({
    first: false,
    second: false
  });

  const toggleRecent = () => {
    setExpandedRecent(!expandedRecent);
  };

  const toggleHistory = (key) => {
    setExpandedHistory(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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
            <Text style={styles.cardDate}>05/05/2025</Text>
          </View>
        </View>

        {/* Recent Section */}
        <Text style={styles.sectionTitle}>Recent</Text>
        <View style={styles.appointmentCard}>
          <View style={[styles.indicator, styles.indicatorOrange]} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>May 2, 2025 - 8:30 AM</Text>
              <TouchableOpacity onPress={toggleRecent} style={styles.statusContainer}>
                <Text style={[styles.statusText, styles.statusOngoing]}>Ongoing</Text>
                <MaterialIcons 
                  name={expandedRecent ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#FFA500" 
                />
              </TouchableOpacity>
            </View>
            {expandedRecent && (
              <View style={styles.dropdownContent}>
                <Text style={styles.dropdownTitle}>Order Details:</Text>
                <Text style={styles.dropdownText}>• Service: Custom Tailoring</Text>
                <Text style={styles.dropdownText}>• Item: Business Suit</Text>
                <Text style={styles.dropdownText}>• Measurements: Completed</Text>
                <Text style={styles.dropdownText}>• Status: In Progress</Text>
              </View>
            )}
          </View>
        </View>

        {/* History Section */}
        <Text style={styles.sectionTitle}>History</Text>
        <View style={styles.appointmentCard}>
          <View style={[styles.indicator, styles.indicatorBlue]} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>April 5, 2025 - 10:00 AM</Text>
              <TouchableOpacity onPress={() => toggleHistory('first')} style={styles.statusContainer}>
                <Text style={[styles.statusText, styles.statusCompleted]}>Completed</Text>
                <MaterialIcons 
                  name={expandedHistory.first ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#16A34A" 
                />
              </TouchableOpacity>
            </View>
            {expandedHistory.first && (
              <View style={styles.dropdownContent}>
                <Text style={styles.dropdownTitle}>Order Details:</Text>
                <Text style={styles.dropdownText}>• Service: Alterations</Text>
                <Text style={styles.dropdownText}>• Item: Evening Dress</Text>
                <Text style={styles.dropdownText}>• Price: ₱2,500</Text>
                <Text style={styles.dropdownText}>• Payment: Completed</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.appointmentCard}>
          <View style={[styles.indicator, styles.indicatorBlue]} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>March 5, 2025 - 10:00 AM</Text>
              <TouchableOpacity onPress={() => toggleHistory('second')} style={styles.statusContainer}>
                <Text style={[styles.statusText, styles.statusCompleted]}>Completed</Text>
                <MaterialIcons 
                  name={expandedHistory.second ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#16A34A" 
                />
              </TouchableOpacity>
            </View>
            {expandedHistory.second && (
              <View style={styles.dropdownContent}>
                <Text style={styles.dropdownTitle}>Order Details:</Text>
                <Text style={styles.dropdownText}>• Service: Custom Tailoring</Text>
                <Text style={styles.dropdownText}>• Item: Work Uniform (5 sets)</Text>
                <Text style={styles.dropdownText}>• Price: ₱7,500</Text>
                <Text style={styles.dropdownText}>• Payment: Completed</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
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
}); 