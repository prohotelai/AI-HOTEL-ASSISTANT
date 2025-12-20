import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { useAuthStore } from './src/stores/authStore'
import { LoginScreen } from './src/screens/LoginScreen'
import { RoomsScreen } from './src/screens/RoomsScreen'
import { TasksScreen } from './src/screens/TasksScreen'
import { WorkOrdersScreen } from './src/screens/WorkOrdersScreen'
import { TaskDetailScreen } from './src/screens/TaskDetailScreen'
import { WorkOrderDetailScreen } from './src/screens/WorkOrderDetailScreen'
import { QueueScreen } from './src/screens/QueueScreen'
import { useInitializeApp } from './src/hooks/useInitializeApp'

const Stack = createNativeStackNavigator()

export default function App() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const { initialized } = useInitializeApp()

  if (!initialized || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' }
        }}
      >
        {!isAuthenticated ? (
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen
              name="Rooms"
              component={RoomsScreen}
              options={{ title: 'Rooms' }}
            />
            <Stack.Screen
              name="Tasks"
              component={TasksScreen}
              options={{ title: 'Housekeeping Tasks' }}
            />
            <Stack.Screen
              name="WorkOrders"
              component={WorkOrdersScreen}
              options={{ title: 'Work Orders' }}
            />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ title: 'Task Details' }}
            />
            <Stack.Screen
              name="WorkOrderDetail"
              component={WorkOrderDetailScreen}
              options={{ title: 'Work Order Details' }}
            />
            <Stack.Screen
              name="Queue"
              component={QueueScreen}
              options={{ title: 'Offline Queue' }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
