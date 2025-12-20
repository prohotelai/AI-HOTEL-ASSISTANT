'use client'

import clsx from 'clsx'

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

const priorityStyles: Record<TicketPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
  HIGH: 'bg-amber-100 text-amber-700 border-amber-200',
  URGENT: 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse',
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide',
        priorityStyles[priority]
      )}
    >
      {priority}
    </span>
  )
}
