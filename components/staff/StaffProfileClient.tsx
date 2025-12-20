/**
 * Staff Profile Client Component - Interactive tabs for HR notes, performance, documents, etc.
 */
'use client'

import { useState } from 'react'
import { Activity, FileText, TrendingUp, MessageCircle, Star, Calendar } from 'lucide-react'
import ActivityTimeline from './ActivityTimeline'
import HRNotesPanel from './HRNotesPanel'
import PerformanceTracker from './PerformanceTracker'
import DocumentManager from './DocumentManager'

type StaffActivity = {
  id: string
  type: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  createdAt: string | Date
}

type StaffHrNote = {
  id: string
  title: string
  content: string
  isConfidential: boolean
  tags: string[]
  createdAt: string | Date
}

type StaffPerformanceMetric = {
  id: string
  name: string
  value: number
  target: number | null
  unit: string | null
  periodStart: string | Date
  periodEnd: string | Date
}

type StaffDocumentSummary = {
  id: string
  title: string
  fileName: string
  fileUrl: string
  mimeType: string | null
  fileSize: number | null
  category: string | null
  isConfidential: boolean
  createdAt: string | Date
}

type StaffPerformanceReview = {
  id: string
  reviewDate: string | Date
  overallRating: string
  status: string
  strengths?: string | null
  areasForImprovement?: string | null
}

interface StaffProfileClientProps {
  profile: {
    id: string
    activities: StaffActivity[]
    hrNotes: StaffHrNote[]
    performanceMetrics: StaffPerformanceMetric[]
    documents: StaffDocumentSummary[]
    performanceReviews: StaffPerformanceReview[]
  }
  canEdit: boolean
}

export default function StaffProfileClient({ profile, canEdit }: StaffProfileClientProps) {
  const [activeTab, setActiveTab] = useState('activity')
  const normalizedHrNotes = profile.hrNotes.map((note) => ({
    ...note,
    createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt)
  }))
  const normalizedPerformanceMetrics = profile.performanceMetrics.map((metric) => ({
    ...metric,
    periodStart: metric.periodStart instanceof Date ? metric.periodStart : new Date(metric.periodStart),
    periodEnd: metric.periodEnd instanceof Date ? metric.periodEnd : new Date(metric.periodEnd)
  }))
  
  const normalizedDocuments = profile.documents.map((doc) => ({
    ...doc,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)
  }))

  const tabs = [
    { id: 'activity', name: 'Activity Timeline', icon: Activity, count: profile.activities.length },
    { id: 'hr-notes', name: 'HR Notes', icon: FileText, count: normalizedHrNotes.length },
    { id: 'performance', name: 'Performance', icon: TrendingUp, count: normalizedPerformanceMetrics.length },
    { id: 'documents', name: 'Documents', icon: FileText, count: profile.documents.length },
    { id: 'reviews', name: 'Reviews', icon: Star, count: profile.performanceReviews.length }
  ]

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.name}
                <span className={`
                  ml-2 px-2 py-0.5 rounded-full text-xs
                  ${activeTab === tab.id
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'activity' && (
          <ActivityTimeline activities={profile.activities} />
        )}

        {activeTab === 'hr-notes' && (
          <HRNotesPanel
            notes={normalizedHrNotes}
            staffId={profile.id}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceTracker
            metrics={normalizedPerformanceMetrics}
            staffId={profile.id}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentManager
            documents={normalizedDocuments}
            staffId={profile.id}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {profile.performanceReviews.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No performance reviews yet</p>
              </div>
            ) : (
              profile.performanceReviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Performance Review - {new Date(review.reviewDate).toLocaleDateString()}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          review.overallRating === 'EXCELLENT' 
                            ? 'bg-green-100 text-green-800'
                            : review.overallRating === 'GOOD'
                            ? 'bg-blue-100 text-blue-800'
                            : review.overallRating === 'AVERAGE'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {review.overallRating}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          review.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : review.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {review.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {review.strengths && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Strengths:</h4>
                      <p className="text-sm text-gray-600">{review.strengths}</p>
                    </div>
                  )}

                  {review.areasForImprovement && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Areas for Improvement:</h4>
                      <p className="text-sm text-gray-600">{review.areasForImprovement}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
