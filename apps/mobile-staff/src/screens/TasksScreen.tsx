import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert
} from 'react-native'
import { useAuthStore } from '../stores/authStore'
import { useQueueStore } from '../stores/queueStore'

interface HousekeepingTask {
  id: string
  roomNumber: string
  taskType: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  assignedTo: string
  dueTime: string
}

export function TasksScreen({ navigation }: any) {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user, token } = useAuthStore()
  const { addAction, isOnline } = useQueueStore()

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/mobile/tasks?hotelId=${user?.hotelId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Fetch tasks error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchTasks()
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      await addAction('UPDATE_TASK', {
        taskId,
        status: 'COMPLETED'
      })
      Alert.alert('Success', 'Task marked as complete')
      fetchTasks()
    } catch (error) {
      Alert.alert('Error', 'Failed to complete task')
    }
  }

  const getPriorityColor = (priority: HousekeepingTask['priority']) => {
    switch (priority) {
      case 'HIGH':
        return '#ef4444'
      case 'MEDIUM':
        return '#f59e0b'
      case 'LOW':
        return '#10b981'
      default:
        return '#6b7280'
    }
  }

  const getStatusColor = (status: HousekeepingTask['status']) => {
    switch (status) {
      case 'COMPLETED':
        return '#10b981'
      case 'IN_PROGRESS':
        return '#3b82f6'
      case 'PENDING':
        return '#f59e0b'
      case 'CANCELLED':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  const renderTask = ({ item }: { item: HousekeepingTask }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
    >
      <View style={styles.taskHeader}>
        <View>
          <Text style={styles.taskTitle}>Room {item.roomNumber}</Text>
          <Text style={styles.taskType}>{item.taskType}</Text>
        </View>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(item.priority) }
          ]}
        >
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>

      <View style={styles.taskDetails}>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        <Text style={styles.dueTime}>Due: {item.dueTime}</Text>
      </View>

      {item.status !== 'COMPLETED' && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleCompleteTask(item.id)}
        >
          <Text style={styles.completeButtonText}>Mark Complete</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>📡 Offline Mode - Changes will sync when online</Text>
        </View>
      )}
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  offlineIndicator: {
    backgroundColor: '#fca5a5',
    padding: 12,
    alignItems: 'center'
  },
  offlineText: {
    color: '#991b1b',
    fontWeight: '600'
  },
  listContent: {
    padding: 12
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  taskType: {
    fontSize: 12,
    color: '#6b7280'
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  priorityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600'
  },
  taskDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600'
  },
  dueTime: {
    fontSize: 12,
    color: '#6b7280'
  },
  completeButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center'
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  }
})
