/**
 * Activity Timeline Component - Display staff activity feed
 */
'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  type LucideIcon,
  UserPlus,
  UserMinus,
  FileText,
  TrendingUp,
  Calendar,
  MessageCircle,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash,
  Upload,
  Download,
} from 'lucide-react'

interface Activity {
  id: string
  type: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  createdAt: string | Date
}

interface ActivityTimelineProps {
  activities: Activity[]
}

const getActivityIcon = (type: string) => {
  const icons: Record<string, LucideIcon> = {
    PROFILE_CREATED: UserPlus,
    PROFILE_UPDATED: Edit,
    NOTE_ADDED: FileText,
    METRIC_LOGGED: TrendingUp,
    DOCUMENT_UPLOADED: Upload,
    DOCUMENT_DELETED: Trash,
    EVENT_SCHEDULED: Calendar,
    MESSAGE_SENT: MessageCircle,
    MESSAGE_RECEIVED: MessageCircle,
    REVIEW_CREATED: Star,
    REVIEW_COMPLETED: CheckCircle,
    STATUS_CHANGED: Clock,
    DEPARTMENT_CHANGED: Edit
  }
  return icons[type] || FileText
}

const getActivityColor = (type: string) => {
  const colors: Record<string, string> = {
    PROFILE_CREATED: 'bg-green-100 text-green-600',
    PROFILE_UPDATED: 'bg-blue-100 text-blue-600',
    NOTE_ADDED: 'bg-purple-100 text-purple-600',
    METRIC_LOGGED: 'bg-indigo-100 text-indigo-600',
    DOCUMENT_UPLOADED: 'bg-cyan-100 text-cyan-600',
    DOCUMENT_DELETED: 'bg-red-100 text-red-600',
    EVENT_SCHEDULED: 'bg-orange-100 text-orange-600',
    MESSAGE_SENT: 'bg-pink-100 text-pink-600',
    MESSAGE_RECEIVED: 'bg-pink-100 text-pink-600',
    REVIEW_CREATED: 'bg-yellow-100 text-yellow-600',
    REVIEW_COMPLETED: 'bg-green-100 text-green-600',
    STATUS_CHANGED: 'bg-gray-100 text-gray-600',
    DEPARTMENT_CHANGED: 'bg-blue-100 text-blue-600'
  }
  return colors[type] || 'bg-gray-100 text-gray-600'
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = getActivityIcon(activity.type)
        const colorClass = getActivityColor(activity.type)

        return (
          <div key={activity.id} className="relative flex gap-4">
            {/* Timeline line */}
            {index < activities.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${colorClass} z-10`}>
              <Icon className="h-6 w-6" />
            </div>

            {/* Content */}
            <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      {Object.entries(activity.metadata).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="font-medium">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>

              {/* Activity type badge */}
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white border border-gray-200 text-gray-700">
                  {activity.type.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
