/**
 * HR Notes Panel - Manage confidential HR notes
 */
'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { FileText, Plus, Lock, Tag, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HRNote {
  id: string
  title: string
  content: string
  isConfidential: boolean
  tags: string[]
  createdAt: Date
}

interface HRNotesPanelProps {
  notes: HRNote[]
  staffId: string
  canEdit: boolean
}

export default function HRNotesPanel({ notes, staffId, canEdit }: HRNotesPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isConfidential: false,
    tags: [] as string[]
  })
  const [newTag, setNewTag] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/staff/${staffId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // Reset form and reload
        setFormData({ title: '', content: '', isConfidential: false, tags: [] })
        setShowAddForm(false)
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to add note:', error)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      })
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    })
  }

  return (
    <div className="space-y-6">
      {/* Add Note Button */}
      {canEdit && !showAddForm && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add HR Note
          </Button>
        </div>
      )}

      {/* Add Note Form */}
      {showAddForm && (
        <div className="border border-gray-300 rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">New HR Note</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter note title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter note content"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  Add Tag
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-blue-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Confidential */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confidential"
                checked={formData.isConfidential}
                onChange={(e) => setFormData({ ...formData, isConfidential: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="confidential" className="text-sm text-gray-700 flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-500" />
                Mark as confidential
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Note
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No HR notes yet</p>
            {canEdit && (
              <p className="text-sm mt-2">Add your first note to track important information</p>
            )}
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`border rounded-lg p-6 ${
                note.isConfidential 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                    {note.isConfidential && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">
                        <Lock className="h-3 w-3" />
                        Confidential
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Content */}
              <p className="text-gray-700 mb-4 whitespace-pre-wrap">{note.content}</p>

              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {note.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Confidential Warning */}
              {note.isConfidential && (
                <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900">
                    This note contains confidential information. Access is restricted to authorized personnel only.
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
