/**
 * Website Scanning Service
 * Crawls hotel website and extracts FAQs, policies, services
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'

interface ScanResult {
  faqs: Array<{ question: string; answer: string }>
  services: string[]
  policies: string[]
  contact: {
    phone?: string
    email?: string
    address?: string
  }
  meta: {
    title?: string
    description?: string
  }
}

/**
 * Scan hotel website and extract information using OpenAI
 */
export async function scanWebsite(
  url: string,
  hotelId: string
): Promise<ScanResult> {
  try {
    // Fetch website content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AI-Hotel-Assistant-Bot/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Extract text content (simple version - remove HTML tags)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000) // Limit to 8000 chars for OpenAI

    // Use OpenAI to extract structured information
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return getFallbackScanResult(url)
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a hotel information extraction assistant. Extract FAQs, services, policies, and contact information from website content. Return valid JSON only.',
          },
          {
            role: 'user',
            content: `Extract information from this hotel website:\n\n${textContent}\n\nReturn JSON with this structure:
{
  "faqs": [{"question": "...", "answer": "..."}],
  "services": ["service1", "service2"],
  "policies": ["policy1", "policy2"],
  "contact": {"phone": "...", "email": "...", "address": "..."},
  "meta": {"title": "...", "description": "..."}
}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!aiResponse.ok) {
      console.error('OpenAI extraction failed:', await aiResponse.text())
      return getFallbackScanResult(url)
    }

    const aiData = await aiResponse.json()
    const extractedContent = aiData.choices[0]?.message?.content

    if (!extractedContent) {
      return getFallbackScanResult(url)
    }

    // Parse JSON response
    const parsed = JSON.parse(extractedContent)
    return validateScanResult(parsed)
  } catch (error) {
    console.error('Website scan error:', error)
    return getFallbackScanResult(url)
  }
}

/**
 * Validate and sanitize scan result
 */
function validateScanResult(data: any): ScanResult {
  return {
    faqs: Array.isArray(data.faqs) ? data.faqs.slice(0, 20) : [],
    services: Array.isArray(data.services) ? data.services.slice(0, 30) : [],
    policies: Array.isArray(data.policies) ? data.policies.slice(0, 20) : [],
    contact: {
      phone: data.contact?.phone || undefined,
      email: data.contact?.email || undefined,
      address: data.contact?.address || undefined,
    },
    meta: {
      title: data.meta?.title || undefined,
      description: data.meta?.description || undefined,
    },
  }
}

/**
 * Fallback result when scanning fails
 */
function getFallbackScanResult(url: string): ScanResult {
  return {
    faqs: [
      {
        question: 'What are your check-in and check-out times?',
        answer: 'Please update with your actual times.',
      },
      {
        question: 'Do you offer free Wi-Fi?',
        answer: 'Please update with your Wi-Fi policy.',
      },
    ],
    services: ['Wi-Fi', 'Room Service', 'Concierge'],
    policies: ['Cancellation Policy', 'Pet Policy', 'Smoking Policy'],
    contact: {
      phone: undefined,
      email: undefined,
      address: undefined,
    },
    meta: {
      title: url,
      description: 'Automatically scanned website content',
    },
  }
}

/**
 * Save scanned data to knowledge base chunks
 */
export async function saveScanToKnowledgeBase(
  hotelId: string,
  scanResult: ScanResult
): Promise<number> {
  let chunksCreated = 0

  // Save FAQs as chunks
  for (const faq of scanResult.faqs) {
    await prisma.knowledgeBaseChunk.create({
      data: {
        hotelId,
        content: `Q: ${faq.question}\nA: ${faq.answer}`,
        metadata: {
          type: 'faq',
          source: 'website_scan',
          question: faq.question,
        },
      },
    })
    chunksCreated++
  }

  // Save services as single chunk
  if (scanResult.services.length > 0) {
    await prisma.knowledgeBaseChunk.create({
      data: {
        hotelId,
        content: `Hotel Services:\n${scanResult.services.join('\n')}`,
        metadata: {
          type: 'services',
          source: 'website_scan',
        },
      },
    })
    chunksCreated++
  }

  // Save policies as chunks
  for (const policy of scanResult.policies) {
    await prisma.knowledgeBaseChunk.create({
      data: {
        hotelId,
        content: `Policy: ${policy}`,
        metadata: {
          type: 'policy',
          source: 'website_scan',
        },
      },
    })
    chunksCreated++
  }

  return chunksCreated
}
