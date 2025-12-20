'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlanBadge } from './PlanBadge';
import { Check, X, Sparkles } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type SubscriptionPlan = 'STARTER' | 'PRO' | 'PRO_PLUS' | 'ENTERPRISE_LITE' | 'ENTERPRISE_MAX';

interface PlanComparisonProps {
  currentPlan: SubscriptionPlan;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  loading?: boolean;
  className?: string;
}

interface PlanDetails {
  name: string;
  price: number;
  description: string;
  recommended?: boolean;
  features: {
    name: string;
    value: string | boolean;
  }[];
}

const PLANS: Record<SubscriptionPlan, PlanDetails> = {
  STARTER: {
    name: 'Starter',
    price: 0,
    description: 'Perfect for trying out the platform',
    features: [
      { name: 'AI Messages/Month', value: '100' },
      { name: 'Voice Minutes/Month', value: '0' },
      { name: 'Tickets/Month', value: '10' },
      { name: 'Storage', value: '1GB' },
      { name: 'PMS Integration', value: false },
      { name: 'Workflow Automation', value: false },
      { name: 'Advanced AI Models', value: false },
      { name: 'API Access', value: false },
      { name: 'Multi-location', value: false },
      { name: 'White-label', value: false },
      { name: 'Support', value: 'Email' },
    ],
  },
  PRO: {
    name: 'Pro',
    price: 999,
    description: 'Best for small to medium hotels',
    recommended: true,
    features: [
      { name: 'AI Messages/Month', value: '1,000' },
      { name: 'Voice Minutes/Month', value: '100' },
      { name: 'Tickets/Month', value: 'Unlimited' },
      { name: 'Storage', value: '10GB' },
      { name: 'PMS Integration', value: true },
      { name: 'Workflow Automation', value: true },
      { name: 'Advanced AI Models', value: false },
      { name: 'API Access', value: false },
      { name: 'Multi-location', value: false },
      { name: 'White-label', value: false },
      { name: 'Support', value: 'Priority' },
    ],
  },
  PRO_PLUS: {
    name: 'Pro Plus',
    price: 1999,
    description: 'Advanced features for growing hotels',
    features: [
      { name: 'AI Messages/Month', value: '3,000' },
      { name: 'Voice Minutes/Month', value: '300' },
      { name: 'Tickets/Month', value: 'Unlimited' },
      { name: 'Storage', value: '25GB' },
      { name: 'PMS Integration', value: true },
      { name: 'Workflow Automation', value: true },
      { name: 'Advanced AI Models', value: true },
      { name: 'API Access', value: true },
      { name: 'Multi-location', value: false },
      { name: 'White-label', value: false },
      { name: 'Support', value: '24/7' },
    ],
  },
  ENTERPRISE_LITE: {
    name: 'Enterprise Lite',
    price: 2999,
    description: 'Enterprise features for larger operations',
    features: [
      { name: 'AI Messages/Month', value: '5,000' },
      { name: 'Voice Minutes/Month', value: '500' },
      { name: 'Tickets/Month', value: 'Unlimited' },
      { name: 'Storage', value: '100GB' },
      { name: 'PMS Integration', value: true },
      { name: 'Workflow Automation', value: true },
      { name: 'Advanced AI Models', value: true },
      { name: 'API Access', value: true },
      { name: 'Multi-location', value: true },
      { name: 'White-label', value: false },
      { name: 'Support', value: 'Dedicated' },
    ],
  },
  ENTERPRISE_MAX: {
    name: 'Enterprise Max',
    price: 3999,
    description: 'Maximum features for large hotel chains',
    features: [
      { name: 'AI Messages/Month', value: '10,000' },
      { name: 'Voice Minutes/Month', value: '1,000' },
      { name: 'Tickets/Month', value: 'Unlimited' },
      { name: 'Storage', value: 'Unlimited' },
      { name: 'PMS Integration', value: true },
      { name: 'Workflow Automation', value: true },
      { name: 'Advanced AI Models', value: true },
      { name: 'API Access', value: true },
      { name: 'Multi-location', value: true },
      { name: 'White-label', value: true },
      { name: 'Support', value: 'Enterprise SLA' },
    ],
  },
};

const PLAN_ORDER: SubscriptionPlan[] = ['STARTER', 'PRO', 'PRO_PLUS', 'ENTERPRISE_LITE', 'ENTERPRISE_MAX'];

// Get all unique feature names
const ALL_FEATURES = Array.from(
  new Set(
    Object.values(PLANS).flatMap(plan => 
      plan.features.map(f => f.name)
    )
  )
);

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
    ) : (
      <X className="h-5 w-5 text-gray-400 mx-auto" />
    );
  }
  return <span className="text-sm">{value}</span>;
}

// Desktop table view
function DesktopView({ currentPlan, onSelectPlan, loading }: PlanComparisonProps) {
  return (
    <div className="hidden lg:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Features</TableHead>
            {PLAN_ORDER.map((planKey) => {
              const plan = PLANS[planKey];
              return (
                <TableHead key={planKey} className="text-center">
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <PlanBadge 
                        plan={planKey} 
                        current={currentPlan === planKey}
                        size="sm"
                      />
                    </div>
                    {plan.recommended && (
                      <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                        <Sparkles className="h-3 w-3" />
                        <span className="text-xs font-semibold">Recommended</span>
                      </div>
                    )}
                    <p className="text-2xl font-bold">
                      ${plan.price.toLocaleString()}
                      <span className="text-xs text-muted-foreground font-normal">/mo</span>
                    </p>
                    <p className="text-xs text-muted-foreground min-h-[32px]">
                      {plan.description}
                    </p>
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ALL_FEATURES.map((featureName) => (
            <TableRow key={featureName}>
              <TableCell className="font-medium">{featureName}</TableCell>
              {PLAN_ORDER.map((planKey) => {
                const plan = PLANS[planKey];
                const feature = plan.features.find(f => f.name === featureName);
                return (
                  <TableCell key={planKey} className="text-center">
                    {feature ? <FeatureValue value={feature.value} /> : '-'}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="font-medium">Action</TableCell>
            {PLAN_ORDER.map((planKey) => (
              <TableCell key={planKey} className="text-center">
                <Button
                  variant={currentPlan === planKey ? 'outline' : 'default'}
                  size="sm"
                  disabled={currentPlan === planKey || loading}
                  onClick={() => onSelectPlan(planKey)}
                  className="w-full"
                >
                  {currentPlan === planKey ? 'Current Plan' : 'Select Plan'}
                </Button>
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// Mobile card view
function MobileView({ currentPlan, onSelectPlan, loading }: PlanComparisonProps) {
  return (
    <div className="lg:hidden space-y-4">
      {PLAN_ORDER.map((planKey) => {
        const plan = PLANS[planKey];
        const isCurrent = currentPlan === planKey;
        
        return (
          <Card key={planKey} className={isCurrent ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <PlanBadge plan={planKey} current={isCurrent} size="md" />
                  {plan.recommended && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Sparkles className="h-3 w-3" />
                      <span className="text-xs font-semibold">Recommended</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    ${plan.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{feature.name}</span>
                    <span className="font-medium">
                      <FeatureValue value={feature.value} />
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter>
              <Button
                variant={isCurrent ? 'outline' : 'default'}
                className="w-full"
                disabled={isCurrent || loading}
                onClick={() => onSelectPlan(planKey)}
              >
                {isCurrent ? 'Current Plan' : 'Select Plan'}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

export function PlanComparison(props: PlanComparisonProps) {
  return (
    <div className={props.className}>
      <DesktopView {...props} />
      <MobileView {...props} />
    </div>
  );
}
