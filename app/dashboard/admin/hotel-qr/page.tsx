'use client'

import { useEffect, useState } from 'react'
import { QrCode, Download, Copy, Printer, Check, AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import * as QRCodeLib from 'qrcode'
import { useAdminContext } from '@/lib/contexts/AdminContext'

/**
 * Admin Hotel QR Page - Read-Only QR Display
 * 
 * ADMIN DASHBOARD RULES:
 * - Display ONE permanent QR per hotel
 * - QR is READ-ONLY (no generate/regenerate actions)
 * - Uses Admin API: GET /api/qr/[hotelId]
 * - Uses AdminContext (enforces /admin route)
 * 
 * STRICT ISOLATION:
 * - NEVER use PMS contexts
 * - NEVER allow QR regeneration
 * - NEVER use booking/room QR endpoints
 */

interface HotelQRData {
  qrCode: string
  qrUrl: string
  hotelName: string
  payload: {
    hotelId: string
    type: string
  }
}

export default function HotelQRCodePage() {
  const [qrData, setQrData] = useState<HotelQRData | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Use AdminContext - enforces /admin route
  const { hotelId, hotelName, isAdmin } = useAdminContext()

  useEffect(() => {
    if (hotelId) {
      fetchHotelQR()
    }
  }, [hotelId])

  async function fetchHotelQR() {
    try {
      setLoading(true)
      setError(null)

      if (!hotelId) {
        throw new Error('No hotel ID found in admin context')
      }

      // Fetch hotel QR code using Admin API
      const res = await fetch(`/api/qr/${hotelId}`)
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch QR code')
      }

      const data = await res.json()
      setQrData(data)

      // Generate QR code image
      const qrImage = await QRCodeLib.toDataURL(data.qrUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrImageUrl(qrImage)

    } catch (err: any) {
      console.error('Failed to fetch hotel QR:', err)
      setError(err.message || 'Failed to load QR code')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyUrl() {
    if (!qrData) return

    try {
      await navigator.clipboard.writeText(qrData.qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy URL to clipboard')
    }
  }

  async function handleDownloadPNG() {
    if (!qrImageUrl || !qrData) return

    const link = document.createElement('a')
    link.href = qrImageUrl
    link.download = `${qrData.hotelName.replace(/\s+/g, '-')}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading your hotel QR code...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading QR Code</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchHotelQR}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!qrData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">No QR Code Found</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Your hotel doesn&apos;t have a QR code yet. Please contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Screen View */}
      <div className="print:hidden">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header with Admin Badge */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <QrCode className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">Hotel QR Code</h1>
              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full uppercase">
                Read-Only
              </span>
            </div>
            <p className="text-slate-400">
              This is your hotel&apos;s permanent QR code. This QR code was generated during hotel creation and cannot be regenerated.
            </p>
          </div>

          {/* Admin Warning Banner */}
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-300">Admin Dashboard - Read-Only View</h3>
                <p className="mt-1 text-sm text-slate-400">
                  You are viewing the permanent hotel QR code. QR codes cannot be regenerated or modified for security reasons. Guests can scan this code to access your hotel services.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg shadow-xl border border-slate-700 p-8">
            {/* Hotel Name */}
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">{qrData.hotelName}</h2>
              <p className="text-sm text-slate-400 mt-1">Hotel Identity QR Code</p>
            </div>

            {/* QR Code Display */}
            <div className="flex justify-center mb-8">
              <div className="p-6 bg-white border-4 border-blue-500 rounded-xl shadow-2xl">
                {qrImageUrl && (
                  <img
                    src={qrImageUrl}
                    alt="Hotel QR Code"
                    className="w-64 h-64"
                  />
                )}
              </div>
            </div>

            {/* QR URL */}
            <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">QR Code URL</p>
              <p className="text-sm font-mono text-blue-400 break-all">{qrData.qrUrl}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy URL
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadPNG}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                Download PNG
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <Printer className="w-5 h-5" />
                Print
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <h3 className="font-semibold text-blue-300 mb-2">🔒 Important Information</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• This QR code is permanent and unique to your hotel</li>
                <li>• It <strong>cannot be regenerated or changed</strong> (security policy)</li>
                <li>• Print and display it at your reception desk or lobby</li>
                <li>• Guests can scan it to access your hotel services instantly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Print View */}
      <div className="hidden print:block print:p-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">{qrData.hotelName}</h1>
          <p className="text-xl text-gray-600 mb-8">Scan to Access Hotel Services</p>

          <div className="flex justify-center mb-8">
            {qrImageUrl && (
              <img
                src={qrImageUrl}
                alt="Hotel QR Code"
                className="w-96 h-96 border-4 border-black p-4"
              />
            )}
          </div>

          <div className="text-lg text-gray-700">
            <p className="font-semibold mb-1">Scan this QR code with your phone camera</p>
            <p className="text-gray-600">to access our services and amenities</p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-300">
            <p className="text-sm text-gray-500 font-mono">{qrData.qrUrl}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
