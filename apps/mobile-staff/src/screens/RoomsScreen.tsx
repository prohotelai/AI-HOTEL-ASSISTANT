import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator
} from 'react-native'
import { useAuthStore } from '../stores/authStore'

interface Room {
  id: string
  number: string
  type: string
  status: 'OCCUPIED' | 'VACANT' | 'MAINTENANCE' | 'CLEANING'
  currentGuest?: string
  checkoutTime?: string
}

export function RoomsScreen({ navigation }: any) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user, token } = useAuthStore()

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/mobile/rooms?hotelId=${user?.hotelId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setRooms(data)
      }
    } catch (error) {
      console.error('Fetch rooms error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchRooms()
  }

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'OCCUPIED':
        return '#ef4444'
      case 'VACANT':
        return '#10b981'
      case 'CLEANING':
        return '#f59e0b'
      case 'MAINTENANCE':
        return '#8b5cf6'
      default:
        return '#6b7280'
    }
  }

  const renderRoom = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={styles.roomCard}
      onPress={() => navigation.navigate('TaskDetail', { roomId: item.id })}
    >
      <View style={styles.roomHeader}>
        <Text style={styles.roomNumber}>Room {item.number}</Text>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.roomType}>{item.type}</Text>
      {item.currentGuest && (
        <Text style={styles.guestInfo}>Guest: {item.currentGuest}</Text>
      )}
      {item.checkoutTime && (
        <Text style={styles.checkoutInfo}>Checkout: {item.checkoutTime}</Text>
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
      <FlatList
        data={rooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
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
  listContent: {
    padding: 12
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12
  },
  roomCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  roomNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937'
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
  roomType: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  guestInfo: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 2
  },
  checkoutInfo: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500'
  }
})
