import clsx from 'clsx'

type StatusBadgeProps = {
  label: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

const TONE_CLASSES: Record<Required<StatusBadgeProps>['tone'], string> = {
  default: 'bg-white/10 text-white',
  success: 'bg-emerald-400/15 text-emerald-200',
  warning: 'bg-amber-400/15 text-amber-200',
  danger: 'bg-rose-400/15 text-rose-200',
}

export function StatusBadge({ label, tone = 'default' }: StatusBadgeProps) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs uppercase tracking-wide', TONE_CLASSES[tone])}>
      {label}
    </span>
  )
}
