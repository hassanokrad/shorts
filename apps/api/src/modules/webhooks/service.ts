import crypto from 'node:crypto';

import { CreditTxnType, Prisma, SubscriptionStatus } from '@prisma/client';
import { StripeWebhookResponseSchema } from '@shorts/shared-types';

import { applyCreditTransaction, db, withDbTransaction } from '../../db';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const STRIPE_TOLERANCE_SECONDS = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS ?? 300);

type StripeEvent = {
  id: string;
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

type StripeSubscriptionObject = {
  id?: string;
  status?: string;
  customer?: string;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

function parseStripeSignature(signatureHeader: string): { timestamp: number; v1: string } {
  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signaturePart = parts.find((part) => part.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    throw new Error('Invalid Stripe signature header');
  }

  const timestamp = Number(timestampPart.slice(2));
  const v1 = signaturePart.slice(3);

  if (!Number.isFinite(timestamp) || !v1) {
    throw new Error('Invalid Stripe signature header');
  }

  return { timestamp, v1 };
}

function verifyStripeSignature(rawBody: Buffer, signatureHeader: string): StripeEvent {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }

  const { timestamp, v1 } = parseStripeSignature(signatureHeader);
  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const digest = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(signedPayload).digest('hex');

  const digestBuffer = Buffer.from(digest, 'utf8');
  const signatureBuffer = Buffer.from(v1, 'utf8');

  if (digestBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
    throw new Error('Invalid Stripe signature');
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > STRIPE_TOLERANCE_SECONDS) {
    throw new Error('Stripe signature timestamp outside tolerance');
  }

  return JSON.parse(rawBody.toString('utf8')) as StripeEvent;
}

function toSubscriptionStatus(status: string | undefined): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return SubscriptionStatus.trialing;
    case 'active':
      return SubscriptionStatus.active;
    case 'past_due':
      return SubscriptionStatus.past_due;
    case 'canceled':
      return SubscriptionStatus.canceled;
    case 'unpaid':
      return SubscriptionStatus.unpaid;
    default:
      return SubscriptionStatus.inactive;
  }
}

function unixToDate(value: number | undefined): Date | null {
  if (!value) {
    return null;
  }

  return new Date(value * 1000);
}

async function resolvePlanIdFromSubscription(subscription: StripeSubscriptionObject, tx: Prisma.TransactionClient): Promise<string | null> {
  const stripePriceId = subscription.items?.data?.[0]?.price?.id;
  if (!stripePriceId) {
    return null;
  }

  const plan = await tx.plan.findUnique({
    where: { stripePriceId },
    select: { id: true }
  });

  return plan?.id ?? null;
}

async function projectSubscriptionState(event: StripeEvent, tx: Prisma.TransactionClient): Promise<void> {
  if (!event.data?.object) {
    return;
  }

  const object = event.data.object;

  if (!('customer' in object) || !object.customer || typeof object.customer !== 'string') {
    return;
  }

  const stripeCustomerId = object.customer;

  if (event.type.startsWith('customer.subscription.')) {
    const subscriptionObj = object as StripeSubscriptionObject;
    const planId = await resolvePlanIdFromSubscription(subscriptionObj, tx);

    await tx.subscription.updateMany({
      where: { stripeCustomerId },
      data: {
        stripeSubscriptionId: typeof subscriptionObj.id === 'string' ? subscriptionObj.id : null,
        status: toSubscriptionStatus(subscriptionObj.status),
        currentPeriodStart: unixToDate(subscriptionObj.current_period_start),
        currentPeriodEnd: unixToDate(subscriptionObj.current_period_end),
        cancelAtPeriodEnd: Boolean(subscriptionObj.cancel_at_period_end),
        planId,
        updatedAt: new Date()
      }
    });

    return;
  }

  if (event.type !== 'invoice.paid') {
    return;
  }

  const subscriptionId = typeof object.subscription === 'string' ? object.subscription : null;
  const periodStart = typeof object.period_start === 'number' ? object.period_start : undefined;
  const periodEnd = typeof object.period_end === 'number' ? object.period_end : undefined;

  const subscription = await tx.subscription.findFirst({
    where: {
      stripeCustomerId,
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {})
    },
    include: {
      plan: {
        select: {
          id: true,
          monthlyCredits: true
        }
      }
    }
  });

  if (!subscription) {
    return;
  }

  if (subscriptionId || periodStart || periodEnd) {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        stripeSubscriptionId: subscriptionId ?? subscription.stripeSubscriptionId,
        status: SubscriptionStatus.active,
        currentPeriodStart: unixToDate(periodStart) ?? subscription.currentPeriodStart,
        currentPeriodEnd: unixToDate(periodEnd) ?? subscription.currentPeriodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: new Date()
      }
    });
  }

  if (!subscription.plan?.monthlyCredits) {
    return;
  }

  const invoiceId = typeof object.id === 'string' ? object.id : event.id;
  const renewalGrantKey = `stripe:invoice.paid:${invoiceId}:monthly-credits`;

  const existingGrant = await tx.creditTransaction.findFirst({
    where: {
      userId: subscription.userId,
      type: CreditTxnType.grant_monthly,
      metadata: {
        path: ['renewalGrantKey'],
        equals: renewalGrantKey
      }
    },
    select: { id: true }
  });

  if (existingGrant) {
    return;
  }

  await applyCreditTransaction(
    {
      userId: subscription.userId,
      type: CreditTxnType.grant_monthly,
      amount: subscription.plan.monthlyCredits,
      metadata: {
        source: 'stripe.invoice.paid',
        stripeEventId: event.id,
        stripeInvoiceId: invoiceId,
        renewalGrantKey
      }
    },
    tx
  );
}

export const webhooksService = {
  async stripe(rawBody: Buffer, signatureHeader: string | undefined) {
    if (!signatureHeader) {
      throw new Error('Missing Stripe-Signature header');
    }

    const event = verifyStripeSignature(rawBody, signatureHeader);
    if (!event.id || !event.type) {
      throw new Error('Malformed Stripe event payload');
    }

    const inserted = await withDbTransaction(async (tx) => {
      try {
        await tx.stripeEvent.create({
          data: {
            stripeEventId: event.id,
            eventType: event.type,
            payload: event as Prisma.InputJsonValue
          }
        });

        await projectSubscriptionState(event, tx);

        await tx.stripeEvent.update({
          where: { stripeEventId: event.id },
          data: { processedAt: new Date() }
        });

        return true;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError
          && error.code === 'P2002'
        ) {
          return false;
        }

        throw error;
      }
    });

    return {
      duplicate: !inserted,
      body: StripeWebhookResponseSchema.parse({ received: true })
    };
  }
};
