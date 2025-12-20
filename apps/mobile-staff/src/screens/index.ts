import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'

export function WorkOrdersScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Work Orders</Text>
      <Text style={styles.placeholder}>List of work orders will display here</Text>
    </ScrollView>
  )
}

export function TaskDetailScreen({ route }: any) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Task Details</Text>
      <Text style={styles.placeholder}>Task ID: {route.params?.taskId}</Text>
    </ScrollView>
  )
}

export function WorkOrderDetailScreen({ route }: any) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Work Order Details</Text>
      <Text style={styles.placeholder}>Work Order ID: {route.params?.id}</Text>
    </ScrollView>
  )
}

export function QueueScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Offline Queue</Text>
      <Text style={styles.placeholder}>Queued actions will display here</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16
  },
  placeholder: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20
  }
})
