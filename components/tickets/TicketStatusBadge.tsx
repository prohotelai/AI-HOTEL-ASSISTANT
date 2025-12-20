'use client'

import clsx from 'clsx'

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_RESPONSE' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'

const statusStyles: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
  WAITING_RESPONSE: 'bg-gray-100 text-gray-700 border-gray-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        statusStyles[status]
      )}
    >
      {status.replace('_', ' ').toLowerCase()}
    </span>
  )
}
