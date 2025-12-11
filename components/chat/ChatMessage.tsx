import { cn } from '@/lib/utils'
import { User, Bot } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex gap-3 mb-4', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-blue-600' : 'bg-gray-200'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-gray-700" />
        )}
      </div>
      <div
        className={cn(
          'flex flex-col max-w-[80%]',
          isUser && 'items-end'
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
        {timestamp && (
          <span className="text-xs text-gray-500 mt-1">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}
