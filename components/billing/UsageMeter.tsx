import React from 'react';
import { Progress } from '@/components/ui/progress';

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  className?: string;
}

function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-600 dark:text-red-400';
  if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function UsageMeter({ label, current, limit, unit = '', className = '' }: UsageMeterProps) {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isUnlimited = limit === -1 || limit === 999999;
  
  const usageColor = getUsageColor(percentage);
  const progressColor = getProgressColor(percentage);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {label}
        </span>
        <span className={`text-sm font-semibold ${usageColor}`}>
          {isUnlimited ? (
            <>
              {current.toLocaleString()} {unit}
              <span className="text-xs text-muted-foreground ml-1">(Unlimited)</span>
            </>
          ) : (
            <>
              {current.toLocaleString()} / {limit.toLocaleString()} {unit}
              <span className="text-xs text-muted-foreground ml-1">
                ({percentage.toFixed(0)}%)
              </span>
            </>
          )}
        </span>
      </div>
      
      {!isUnlimited && (
        <div className="relative">
          <Progress 
            value={percentage} 
            className="h-2"
          />
          <div 
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${progressColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      
      {isUnlimited && (
        <div className="h-2 bg-secondary rounded-full relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse opacity-50" />
        </div>
      )}
    </div>
  );
}
