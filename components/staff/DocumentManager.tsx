/**
 * Document Manager - Upload and manage staff documents
 */
'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { FileText, Upload, Download, Trash2, Lock, File, Image, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StaffDocument {
  id: string
  title: string
  fileName: string
  fileUrl: string
  mimeType: string | null
  fileSize: number | null
  category: string | null
  isConfidential: boolean
  createdAt: Date
}

interface DocumentManagerProps {
  documents: StaffDocument[]
  staffId: string
  canEdit: boolean
}

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return File
  
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('pdf')) return FileType
  if (mimeType.includes('word') || mimeType.includes('document')) return FileText
  return File
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'Unknown size'
  
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export default function DocumentManager({ documents, staffId, canEdit }: DocumentManagerProps) {
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    fileName: '',
    fileUrl: '',
    category: '',
    isConfidential: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    
    try {
      const response = await fetch(`/api/staff/${staffId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setFormData({ fileName: '', fileUrl: '', category: '', isConfidential: false })
        setShowUploadForm(false)
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to upload document:', error)
    } finally {
      setUploading(false)
    }
  }

  const categories = [
    'Contract',
    'Certificate',
    'ID Document',
    'Resume',
    'Training',
    'Performance Review',
    'Medical',
    'Other'
  ]

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      {canEdit && !showUploadForm && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowUploadForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="border border-gray-300 rounded-lg p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Document</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fileName}
                onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                placeholder="Employment_Contract_2024.pdf"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* File URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                placeholder="https://storage.example.com/documents/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload file to your storage provider first, then paste the URL here
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Confidential */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="documentConfidential"
                checked={formData.isConfidential}
                onChange={(e) => setFormData({ ...formData, isConfidential: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="documentConfidential" className="text-sm text-gray-700 flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-500" />
                Mark as confidential
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No documents uploaded yet</p>
          {canEdit && (
            <p className="text-sm mt-2">Upload important staff documents for easy access</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const FileIcon = getFileIcon(doc.mimeType)

            return (
              <div
                key={doc.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  doc.isConfidential 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Document Icon & Name */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                    doc.isConfidential ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <FileIcon className={`h-6 w-6 ${
                      doc.isConfidential ? 'text-red-600' : 'text-blue-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {doc.fileName}
                    </h4>
                    {doc.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        {doc.category}
                      </span>
                    )}
                  </div>

                  {doc.isConfidential && (
                    <Lock className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                </div>

                {/* File Details */}
                <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>
                    {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                  
                  {canEdit && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this document?')) {
                          fetch(`/api/staff/${staffId}/documents/${doc.id}`, {
                            method: 'DELETE'
                          }).then(() => window.location.reload())
                        }
                      }}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
