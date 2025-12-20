import React from 'react';
import { Badge } from '@/components/ui/badge';

type SubscriptionPlan = 'STARTER' | 'PRO' | 'PRO_PLUS' | 'ENTERPRISE_LITE' | 'ENTERPRISE_MAX';

interface PlanBadgeProps {
  plan: SubscriptionPlan;
  current?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PLAN_COLORS = {
  STARTER: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 border-gray-300',
  PRO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-blue-300',
  PRO_PLUS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 border-purple-300',
  ENTERPRISE_LITE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 border-amber-300',
  ENTERPRISE_MAX: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100 border-slate-400',
};

const PLAN_LABELS = {
  STARTER: 'Starter',
  PRO: 'Pro',
  PRO_PLUS: 'Pro Plus',
  ENTERPRISE_LITE: 'Enterprise Lite',
  ENTERPRISE_MAX: 'Enterprise Max',
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

export function PlanBadge({ plan, current = false, size = 'md', className = '' }: PlanBadgeProps) {
  const colorClass = PLAN_COLORS[plan];
  const label = PLAN_LABELS[plan];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Badge className={`${colorClass} ${sizeClass} border`}>
        {label}
      </Badge>
      {current && (
        <span className="text-xs text-muted-foreground font-medium">
          Current Plan
        </span>
      )}
    </div>
  );
}
