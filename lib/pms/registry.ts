import { PMSProviderAdapter } from '@/lib/pms/types'
import { mockProviderAdapter } from '@/lib/pms/providers/mockProvider'

const registry = new Map<string, PMSProviderAdapter>()

function register(adapter: PMSProviderAdapter) {
  registry.set(adapter.key, adapter)
}

register(mockProviderAdapter)

export function getProviderAdapter(providerKey: string): PMSProviderAdapter {
  const normalized = providerKey.toLowerCase()
  const adapter = registry.get(normalized)
  if (!adapter) {
    throw new Error(`Unsupported PMS provider: ${providerKey}`)
  }
  return adapter
}

export function listProviderKeys(): string[] {
  return Array.from(registry.keys())
}
