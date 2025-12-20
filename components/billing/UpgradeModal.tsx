'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlanBadge } from './PlanBadge';
import { Check, X, ArrowRight } from 'lucide-react';

type SubscriptionPlan = 'STARTER' | 'PRO' | 'PRO_PLUS' | 'ENTERPRISE_LITE' | 'ENTERPRISE_MAX';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan: SubscriptionPlan;
  targetPlan: SubscriptionPlan;
  onConfirm: () => void;
  loading?: boolean;
}

const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  STARTER: 0,
  PRO: 999,
  PRO_PLUS: 1999,
  ENTERPRISE_LITE: 2999,
  ENTERPRISE_MAX: 3999,
};

const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  STARTER: [
    '100 AI messages/month',
    '10 tickets/month',
    '1GB storage',
    'Basic chat widget',
    'Email support',
  ],
  PRO: [
    '1,000 AI messages/month',
    'Unlimited tickets',
    '10GB storage',
    'PMS integration',
    'Workflow automation',
    'Priority support',
  ],
  PRO_PLUS: [
    '3,000 AI messages/month',
    'Unlimited tickets',
    '25GB storage',
    'Advanced AI models',
    'Custom workflows',
    'API access',
    '24/7 support',
  ],
  ENTERPRISE_LITE: [
    '5,000 AI messages/month',
    'Unlimited tickets',
    '100GB storage',
    'Multi-location support',
    'Dedicated account manager',
    'Custom integrations',
    'SLA guarantee',
  ],
  ENTERPRISE_MAX: [
    '10,000 AI messages/month',
    'Unlimited everything',
    'Unlimited storage',
    '750-1000 rooms support',
    'White-label options',
    'Enterprise SLA',
    'Custom development',
  ],
};

export function UpgradeModal({
  open,
  onClose,
  currentPlan,
  targetPlan,
  onConfirm,
  loading = false,
}: UpgradeModalProps) {
  const currentPrice = PLAN_PRICES[currentPlan];
  const targetPrice = PLAN_PRICES[targetPlan];
  const priceDifference = targetPrice - currentPrice;
  
  const currentFeatures = PLAN_FEATURES[currentPlan];
  const targetFeatures = PLAN_FEATURES[targetPlan];
  
  const newFeatures = targetFeatures.filter(f => !currentFeatures.includes(f));
  const removedFeatures = currentFeatures.filter(f => !targetFeatures.includes(f));
  const isDowngrade = priceDifference < 0;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isDowngrade ? 'Downgrade' : 'Upgrade'} Your Plan
          </DialogTitle>
          <DialogDescription>
            Review the changes to your subscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Comparison */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <PlanBadge plan={currentPlan} size="lg" />
              <p className="text-2xl font-bold mt-2">
                ${currentPrice.toLocaleString()}
                <span className="text-sm text-muted-foreground font-normal">/mo</span>
              </p>
            </div>
            
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            
            <div className="text-center">
              <PlanBadge plan={targetPlan} size="lg" />
              <p className="text-2xl font-bold mt-2">
                ${targetPrice.toLocaleString()}
                <span className="text-sm text-muted-foreground font-normal">/mo</span>
              </p>
            </div>
          </div>

          {/* Price Difference */}
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isDowngrade ? 'Your new monthly cost' : 'Additional monthly cost'}
            </p>
            <p className="text-3xl font-bold mt-1">
              {isDowngrade ? '-' : '+'} ${Math.abs(priceDifference).toLocaleString()}
              <span className="text-sm text-muted-foreground font-normal">/mo</span>
            </p>
          </div>

          {/* Feature Changes */}
          <div className="space-y-4">
            {newFeatures.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  {isDowngrade ? 'Features you&apos;ll lose' : 'New features you&apos;ll get'}
                </h4>
                <ul className="space-y-2">
                  {newFeatures.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {removedFeatures.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <X className="h-4 w-4 text-red-600" />
                  Features you&apos;ll lose
                </h4>
                <ul className="space-y-2">
                  {removedFeatures.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground">
            {isDowngrade ? (
              <p>
                Your downgrade will take effect at the end of your current billing period. 
                You&apos;ll continue to have access to your current plan features until then.
              </p>
            ) : (
              <p>
                You&apos;ll be charged ${targetPrice.toLocaleString()} starting today. Your current 
                billing cycle will be prorated. Changes take effect immediately.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              'Processing...'
            ) : (
              `Confirm ${isDowngrade ? 'Downgrade' : 'Upgrade'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
