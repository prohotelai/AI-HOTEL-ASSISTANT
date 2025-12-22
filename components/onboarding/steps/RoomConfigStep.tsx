/**
 * Onboarding Step 2: Room Configuration
 * 
 * Allows admin to set up room types and basic configuration
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DoorOpen, Plus, Trash2 } from 'lucide-react'

interface Room {
  roomType: string
  count: number
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
  const [rooms, setRooms] = useState<Room[]>([
    { roomType: 'Standard', count: 10 },
  ])
  const [newRoomType, setNewRoomType] = useState('')
  const [newRoomCount, setNewRoomCount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleAddRoom = () => {
    if (!newRoomType.trim() || !newRoomCount) return

    const count = parseInt(newRoomCount)
    if (count <= 0) return

    setRooms([...rooms, { roomType: newRoomType.trim(), count }])
    setNewRoomType('')
    setNewRoomCount('')
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
    setSuccess(false)

    try {
      const res = await fetch(`/api/hotels/${hotelId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms }),
      })

      if (!res.ok) {
        throw new Error('Failed to save room configuration')
      }

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

  const totalRooms = rooms.reduce((sum, room) => sum + room.count, 0)

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
          Set up your room types and inventory
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-green-800">✓ Room configuration saved</p>
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
                    <p className="font-medium text-gray-900">{room.roomType}</p>
                    <p className="text-sm text-gray-600">{room.count} rooms</p>
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
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Room Type
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Type Name
                </label>
                <input
                  type="text"
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  placeholder="e.g., Deluxe, Standard, Suite"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Rooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newRoomCount}
                    onChange={(e) => setNewRoomCount(e.target.value)}
                    placeholder="e.g., 10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddRoom}
                    disabled={!newRoomType.trim() || !newRoomCount}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
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
