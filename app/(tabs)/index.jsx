import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';

export default function HomePage() {
  const userName = "Dianne";

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <Header userName={userName} />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 90 }}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back, {userName}!</Text>
          <Text style={styles.welcomeSubtext}>
            "We're tailoring your orders with care.{'\n'}Here's what's happening today."
          </Text>
        </View>

        {/* Updated Order Card */}
        <View style={styles.orderCard}>
          <Text style={styles.orderTitle}><Text style={styles.boldText}>Current Order</Text> - Queue #002</Text>

          <View style={styles.orderDetails}>
            <View>
              <Text style={styles.itemText}>Volleyball Jersey</Text>
              <Text style={styles.itemDetail}>Size: M</Text>
              <Text style={styles.itemDetail}>Items: 30</Text>
            </View>
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>Estimated Completion Date</Text>
              <Text style={styles.date}>01/10/2025</Text>
            </View>
          </View>


          <View style={styles.orderProgressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressStep, styles.stepDone]} />
            <View style={[styles.progressStep, styles.stepCurrent]} />
            <View style={[styles.progressStep, styles.stepPending]} />
          </View>
          <Text style={styles.progressText}>Queued → In Progress → Ready</Text>
        </View>
        </View>

        <Text style={styles.sectionTitle}>Announcements</Text>

        <View style={styles.announcementCard}>
          <View style={[styles.indicator, styles.indicatorGreen]} />
          <MaterialIcons name="access-time" size={24} color="#16A34A" style={styles.announcementIcon} />
          <View>
            <Text style={styles.announcementTitle}>Next Appointment</Text>
            <Text style={styles.announcementDate}>01/05/2025</Text>
          </View>
        </View>

        <View style={styles.announcementCard}>
          <View style={[styles.indicator, styles.indicatorYellow]} />
          <MaterialCommunityIcons name="file-document-outline" size={24} color="#FFA500" style={styles.announcementIcon} />
          <View>
            <Text style={styles.announcementTitle}>Order Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Pending</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>

        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <Text style={styles.activityDate}>01/03</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Your layout has been processed</Text>
              <Text style={styles.activityTime}>10:00 AM</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <Text style={styles.activityDate}>01/02</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Appointment Confirmed</Text>
              <Text style={styles.activityTime}>11:00 AM</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <Text style={styles.activityDate}>01/01</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Downpayment validated (Gcash)</Text>
              <Text style={styles.activityTime}>12:00 PM</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <MaterialIcons name="add" size={30} color="#fff" />
      </TouchableOpacity>
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
    backgroundColor: '#2E8B57',
  },
  stepPending: {
    backgroundColor: '#A9A9A9',
  },
  progressText: {
    fontSize: 12,
    color: '#687076',
    textAlign: 'right',
  },
  
  boldText: {
    fontWeight: 'bold',
    color: '#000',
  },
  orderTitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 13,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
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
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  progressStep: {
    width: 16,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  stepDone: {
    backgroundColor: '#A9A9A9',
  },
  stepCurrent: {
    backgroundColor: '#2E8B57',
  },
  stepPending: {
    backgroundColor: '#A9A9A9',
  },
  progressText: {
    fontSize: 12,
    color: '#687076',
    textAlign: 'center',
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
  activityTime: {
    fontSize: 12,
    color: '#687076',
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
});
