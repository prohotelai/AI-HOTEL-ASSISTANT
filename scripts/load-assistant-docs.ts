#!/usr/bin/env npx ts-node

/**
 * Load Internal Documentation for AI Assistant
 * 
 * This script loads all internal documentation files from docs/internal/
 * into the knowledge base for RAG-powered assistant responses.
 * 
 * Usage:
 *   npm run assistant:load-docs
 *   or
 *   npx ts-node scripts/load-assistant-docs.ts
 */

import { loadInternalDocumentation } from '../lib/assistant/rag-loader'

async function main() {
  console.log('🚀 Loading internal documentation for AI Assistant...\n')

  try {
    await loadInternalDocumentation()
    
    console.log('\n✅ Internal documentation loaded successfully!')
    console.log('\n📚 Documents available for RAG queries:')
    console.log('   - platform-overview.md (354 lines)')
    console.log('   - dashboard-guide.md (350+ lines)')
    console.log('\n💡 AI Assistant can now provide context-aware responses!')
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Failed to load internal documentation:', error)
    process.exit(1)
  }
}

main()
