/**
 * Onboarding Step 2: Room Configuration
 * 
 * CRITICAL: Maps form state exactly to API schema
 * Frontend Room = { roomType, count } 
 * API RoomType = { name, totalRooms, capacity, basePrice, description? }
 * 
 * Creates atomic transaction with:
 * - RoomType records
 * - Individual Room inventory
 * - 365-day RoomAvailability calendar
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DoorOpen, Plus, Trash2, AlertCircle } from 'lucide-react'

interface RoomInput {
  name: string
  totalRooms: number
  capacity: number
  basePrice: number
  description?: string
}

interface RoomConfigStepProps {
  hotelId: string
  onComplete: () => void
  onNext: () => void
  onBack: () => void
}

export default function RoomConfigStep({
  hotelId,
  onComplete,
  onNext,
  onBack,
}: RoomConfigStepProps) {
  const [rooms, setRooms] = useState<RoomInput[]>([
    { name: 'Standard', totalRooms: 10, capacity: 2, basePrice: 100 },
  ])
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomCount, setNewRoomCount] = useState('')
  const [newRoomCapacity, setNewRoomCapacity] = useState('2')
  const [newRoomPrice, setNewRoomPrice] = useState('100')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errorDetails, setErrorDetails] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  const handleAddRoom = () => {
    // Client-side validation before adding
    const name = newRoomName.trim()
    if (!name) {
      setError('Room type name is required')
      return
    }

    const count = parseInt(newRoomCount)
    if (!Number.isInteger(count) || count < 1) {
      setError('Number of rooms must be at least 1')
      return
    }

    const capacity = parseInt(newRoomCapacity)
    if (!Number.isInteger(capacity) || capacity < 1) {
      setError('Room capacity must be at least 1')
      return
    }

    const price = parseFloat(newRoomPrice)
    if (isNaN(price) || price < 0) {
      setError('Base price must be a valid number >= 0')
      return
    }

    // Check for duplicate room type name
    if (rooms.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setError('Room type with this name already exists')
      return
    }

    setRooms([...rooms, { name, totalRooms: count, capacity, basePrice: price }])
    setNewRoomName('')
    setNewRoomCount('')
    setNewRoomCapacity('2')
    setNewRoomPrice('100')
    setError('')
  }

  const handleRemoveRoom = (index: number) => {
    setRooms(rooms.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (rooms.length === 0) {
      setError('Please add at least one room type')
      return
    }

    setSaving(true)
    setError('')
    setErrorDetails([])
    setSuccess(false)

    try {
      // Map form state to API contract
      const payload = {
        roomTypes: rooms.map((r) => ({
          name: r.name,
          totalRooms: r.totalRooms,
          capacity: r.capacity,
          basePrice: r.basePrice,
          description: `${r.name} room type`,
        })),
      }

      const res = await fetch(`/api/hotels/${hotelId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        // Surface detailed error messages from API
        if (data.details && Array.isArray(data.details)) {
          setErrorDetails(data.details)
          setError('Please fix the following issues:')
        } else if (data.reason) {
          setError(`Error: ${data.error} — ${data.reason}`)
        } else {
          setError(data.error || 'Failed to save room configuration')
        }
        return
      }

      // Success
      setSuccess(true)
      onComplete()
      setTimeout(onNext, 800)
    } catch (error: any) {
      console.error('Failed to save rooms:', error)
      setError(error.message || 'Failed to save room configuration')
    } finally {
      setSaving(false)
    }
  }

  const totalRooms = rooms.reduce((sum, room) => sum + room.totalRooms, 0)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Room Configuration
        </h2>
        <p className="text-gray-600">
          Set up your room types and inventory. Each room will be assigned a unique room number.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">{error}</p>
              {errorDetails.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {errorDetails.map((detail, idx) => (
                    <li key={idx} className="text-sm text-red-700 ml-4">
                      • {detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-green-800">✓ Room configuration saved successfully</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room Type List */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <DoorOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Your Room Types
            </h3>
            <span className="ml-auto px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              {totalRooms} rooms total
            </span>
          </div>

          {rooms.length > 0 ? (
            <div className="space-y-2 mb-6">
              {rooms.map((room, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">{room.name}</p>
                    <p className="text-sm text-gray-600">
                      {room.totalRooms} rooms · Capacity: {room.capacity} · ${room.basePrice.toFixed(2)}/night
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRoom(idx)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 mb-6">No room types added yet</p>
          )}

          {/* Add New Room Type */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Room Type
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Type Name *
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => {
                    setNewRoomName(e.target.value)
                    setError('')
                  }}
                  placeholder="e.g., Deluxe, Standard, Suite"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Rooms *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newRoomCount}
                    onChange={(e) => {
                      setNewRoomCount(e.target.value)
                      setError('')
                    }}
                    placeholder="e.g., 10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity (guests) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newRoomCapacity}
                    onChange={(e) => {
                      setNewRoomCapacity(e.target.value)
                      setError('')
                    }}
                    placeholder="e.g., 2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newRoomPrice}
                    onChange={(e) => {
                      setNewRoomPrice(e.target.value)
                      setError('')
                    }}
                    placeholder="e.g., 100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddRoom}
                disabled={!newRoomName.trim() || !newRoomCount || !newRoomCapacity || !newRoomPrice}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Add Room Type
              </button>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={saving || rooms.length === 0}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          You can modify room types later in your hotel settings
        </p>
      </form>
    </motion.div>
  )
}
