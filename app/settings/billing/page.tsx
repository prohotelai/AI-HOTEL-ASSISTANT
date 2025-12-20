import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { BillingDashboard } from './BillingDashboard';

async function getBillingData(hotelId: string) {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      id: true,
      name: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      maxAIMessagesPerMonth: true,
      maxVoiceMinutesPerMonth: true,
      maxTicketsPerMonth: true,
      maxStorageGB: true,
      currentMonthStart: true,
      aiMessagesUsed: true,
      voiceMinutesUsed: true,
      ticketsCreated: true,
      storageUsedGB: true,
    },
  });

  if (!hotel) {
    throw new Error('Hotel not found');
  }

  // Get usage history for the last 6 months
  const usageHistory = await prisma.usageRecord.findMany({
    where: { hotelId },
    orderBy: { month: 'desc' },
    take: 6,
  });

  return { hotel, usageHistory };
}

export default async function BillingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Get hotelId from session user
  const hotelId = (session.user as { hotelId?: string }).hotelId;
  
  if (!hotelId) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <p className="text-destructive font-semibold">
            No hotel associated with your account. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  const { hotel, usageHistory } = await getBillingData(hotelId);

  return <BillingDashboard hotel={hotel} usageHistory={usageHistory} />;
}
