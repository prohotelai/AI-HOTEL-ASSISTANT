'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanBadge } from '@/components/billing/PlanBadge';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { PlanComparison } from '@/components/billing/PlanComparison';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Calendar, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type SubscriptionPlan = 'STARTER' | 'PRO' | 'PRO_PLUS' | 'ENTERPRISE_LITE' | 'ENTERPRISE_MAX';
type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'PAUSED';

interface Hotel {
  id: string;
  name: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  maxAIMessagesPerMonth: number;
  maxVoiceMinutesPerMonth: number;
  maxTicketsPerMonth: number;
  maxStorageGB: number;
  currentMonthStart: Date;
  aiMessagesUsed: number;
  voiceMinutesUsed: number;
  ticketsCreated: number;
  storageUsedGB: number;
}

interface UsageRecord {
  id: string;
  hotelId: string;
  month: Date;
  aiMessages: number;
  voiceMinutes: number;
  ticketsCreated: number;
  storageUsedGB: number;
  planAtTime: SubscriptionPlan;
  amountCharged: number | null;
}

interface BillingDashboardProps {
  hotel: Hotel;
  usageHistory: UsageRecord[];
}

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'success',
  TRIALING: 'info',
  PAST_DUE: 'warning',
  CANCELED: 'destructive',
  EXPIRED: 'destructive',
  PAUSED: 'warning',
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Active',
  TRIALING: 'Trial',
  PAST_DUE: 'Past Due',
  CANCELED: 'Canceled',
  EXPIRED: 'Expired',
  PAUSED: 'Paused',
};

export function BillingDashboard({ hotel, usageHistory }: BillingDashboardProps) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<SubscriptionPlan>(hotel.subscriptionPlan);
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (plan === hotel.subscriptionPlan) return;
    setTargetPlan(plan);
    setUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    setLoading(true);
    try {
      // Call API to create Stripe checkout session or update subscription
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotel.id,
          targetPlan,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // If Stripe checkout URL is returned, redirect to it
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          // Otherwise reload the page to show updated data
          window.location.reload();
        }
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to upgrade plan');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      // Create Stripe billing portal session
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: hotel.id }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.portalUrl;
      } else {
        alert('Failed to open billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isTrial = hotel.subscriptionStatus === 'TRIALING';
  const isPastDue = hotel.subscriptionStatus === 'PAST_DUE';
  const nextBillingDate = hotel.subscriptionEndsAt || hotel.trialEndsAt;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan and usage
        </p>
      </div>

      {/* Status Alert */}
      {(isTrial || isPastDue) && (
        <Card className={isPastDue ? 'border-destructive' : 'border-blue-500'}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className={`h-5 w-5 mt-0.5 ${isPastDue ? 'text-destructive' : 'text-blue-500'}`} />
              <div className="flex-1">
                <p className="font-semibold">
                  {isTrial && 'Trial Period Active'}
                  {isPastDue && 'Payment Past Due'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isTrial && nextBillingDate && (
                    <>Your trial ends on {format(new Date(nextBillingDate), 'MMMM d, yyyy')}. Upgrade to continue using all features.</>
                  )}
                  {isPastDue && (
                    <>Your payment is overdue. Please update your payment method to avoid service interruption.</>
                  )}
                </p>
                {isPastDue && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="mt-3"
                    onClick={handleManageSubscription}
                    disabled={loading}
                  >
                    Update Payment Method
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your active subscription details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <PlanBadge plan={hotel.subscriptionPlan} current size="lg" />
              <Badge 
                variant={STATUS_COLORS[hotel.subscriptionStatus] as any}
                className="mt-2"
              >
                {STATUS_LABELS[hotel.subscriptionStatus]}
              </Badge>
            </div>
            
            {hotel.stripeCustomerId && (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={loading}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            )}
          </div>

          {nextBillingDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {isTrial ? 'Trial ends' : 'Next billing'}: {format(new Date(nextBillingDate), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Meters */}
      <Card>
        <CardHeader>
          <CardTitle>Current Usage</CardTitle>
          <CardDescription>
            Usage resets on {format(new Date(hotel.currentMonthStart), 'MMMM d')} each month
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UsageMeter
            label="AI Messages"
            current={hotel.aiMessagesUsed}
            limit={hotel.maxAIMessagesPerMonth}
            unit="messages"
          />
          
          <UsageMeter
            label="Voice Minutes"
            current={hotel.voiceMinutesUsed}
            limit={hotel.maxVoiceMinutesPerMonth}
            unit="minutes"
          />
          
          <UsageMeter
            label="Support Tickets"
            current={hotel.ticketsCreated}
            limit={hotel.maxTicketsPerMonth}
            unit="tickets"
          />
          
          <UsageMeter
            label="Storage"
            current={hotel.storageUsedGB}
            limit={hotel.maxStorageGB}
            unit="GB"
          />
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that best fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanComparison
            currentPlan={hotel.subscriptionPlan}
            onSelectPlan={handleSelectPlan}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Usage History */}
      {usageHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage History
            </CardTitle>
            <CardDescription>
              Your usage over the past 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">AI Messages</TableHead>
                  <TableHead className="text-right">Voice Minutes</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Storage (GB)</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageHistory.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.month), 'MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <PlanBadge plan={record.planAtTime} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      {record.aiMessages.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.voiceMinutes.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.ticketsCreated.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.storageUsedGB.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {record.amountCharged !== null 
                        ? `$${record.amountCharged.toLocaleString()}`
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentPlan={hotel.subscriptionPlan}
        targetPlan={targetPlan}
        onConfirm={handleConfirmUpgrade}
        loading={loading}
      />
    </div>
  );
}
