'use client'

/**
 * PMS Integration Dashboard
 * View and manage external PMS connections
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import {
  Server,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  RefreshCw,
  Unplug,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PMSConfig {
  configured: boolean
  pmsType?: string
  version?: string
  endpoint?: string
  status?: string
  lastSyncedAt?: string
  lastError?: string
}

const PMS_NAMES: Record<string, string> = {
  OPERA: 'Oracle Opera',
  MEWS: 'Mews Commander',
  CLOUDBEDS: 'Cloudbeds',
  PROTEL: 'Protel Air',
  APALEO: 'Apaleo',
  CUSTOM: 'Custom Integration'
}

export default function PMSIntegrationPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [config, setConfig] = useState<PMSConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const loadConfiguration = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/pms/configuration')
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Failed to load PMS configuration:', error)
      toast({
        title: 'Error',
        description: 'Failed to load PMS configuration',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadConfiguration()
  }, [loadConfiguration])

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your PMS? This will stop data synchronization.')) {
      return
    }

    setDisconnecting(true)
    try {
      const response = await fetch('/api/admin/pms/configuration', {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Disconnected',
          description: 'PMS has been disconnected successfully'
        })
        await loadConfiguration()
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect PMS',
        variant: 'destructive'
      })
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PMS Integration</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your external property management system connection
          </p>
        </div>
        {config?.configured ? (
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/admin/pms/connect')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Reconfigure
          </Button>
        ) : (
          <Button
            onClick={() => router.push('/dashboard/admin/pms/connect')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Connect PMS
          </Button>
        )}
      </div>

      {config?.configured ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Connection Details
              </CardTitle>
              <CardDescription>Current PMS integration status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">PMS Type:</span>
                <span className="font-semibold">{PMS_NAMES[config.pmsType || ''] || config.pmsType}</span>
              </div>

              {config.version && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Version:</span>
                  <span className="font-semibold">{config.version}</span>
                </div>
              )}

              {config.endpoint && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Endpoint:</span>
                  <a
                    href={config.endpoint}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                  >
                    View
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Status:</span>
                <Badge
                  variant={config.status === 'CONNECTED' ? 'default' : 'destructive'}
                  className={cn(
                    config.status === 'CONNECTED' && 'bg-green-600'
                  )}
                >
                  {config.status === 'CONNECTED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {config.status === 'FAILED' && <XCircle className="w-3 h-3 mr-1" />}
                  {config.status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                  {config.status}
                </Badge>
              </div>

              {config.lastSyncedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Last Synced:</span>
                  <span className="text-sm">
                    {new Date(config.lastSyncedAt).toLocaleString()}
                  </span>
                </div>
              )}

              {config.lastError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Last Error</AlertTitle>
                  <AlertDescription>{config.lastError}</AlertDescription>
                </Alert>
              )}

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="w-full"
                >
                  <Unplug className="w-4 h-4 mr-2" />
                  {disconnecting ? 'Disconnecting...' : 'Disconnect PMS'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sync Statistics</CardTitle>
              <CardDescription>Data synchronization overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                <span className="text-sm">Bookings Synced:</span>
                <span className="font-bold text-blue-600">Coming Soon</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded">
                <span className="text-sm">Guests Synced:</span>
                <span className="font-bold text-green-600">Coming Soon</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded">
                <span className="text-sm">Rooms Synced:</span>
                <span className="font-bold text-purple-600">Coming Soon</span>
              </div>

              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sync Frequency</AlertTitle>
                <AlertDescription>
                  Data synchronization runs every 15 minutes by default.
                  Configure sync settings in the Settings page.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Server className="w-16 h-16 text-slate-400" />
                  <Plus className="w-6 h-6 text-blue-600 absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">No PMS Connected</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Connect your external property management system to sync data automatically
                </p>
                <Button
                  onClick={() => router.push('/dashboard/admin/pms/connect')}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Connect External PMS
                </Button>
              </div>

              <Alert className="mt-8 text-left max-w-2xl mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Benefits of PMS Integration</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                    <li>Automatic synchronization of bookings, guests, and rooms</li>
                    <li>Real-time availability updates</li>
                    <li>Unified guest profiles across systems</li>
                    <li>AI-powered insights from PMS data</li>
                    <li>Reduced manual data entry</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
