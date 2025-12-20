import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Lock } from 'lucide-react';

interface FeatureCardProps {
  name: string;
  description: string;
  available: boolean;
  requiredPlan?: string;
  onUpgrade?: () => void;
  className?: string;
}

export function FeatureCard({
  name,
  description,
  available,
  requiredPlan,
  onUpgrade,
  className = '',
}: FeatureCardProps) {
  return (
    <Card className={`${!available ? 'opacity-75' : ''} ${className}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {available ? (
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              {name}
            </CardTitle>
            <CardDescription className="mt-1.5">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      {!available && requiredPlan && (
        <CardFooter className="pt-0">
          <div className="w-full space-y-2">
            <p className="text-xs text-muted-foreground">
              Available in <span className="font-semibold">{requiredPlan}</span> plan
            </p>
            {onUpgrade && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onUpgrade}
              >
                Upgrade to unlock
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
