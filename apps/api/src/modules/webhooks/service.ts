import crypto from 'node:crypto';

import { CreditTxnType, Prisma, SubscriptionStatus } from '@prisma/client';
import { StripeWebhookResponseSchema } from '@shorts/shared-types';

import { applyCreditTransaction, withDbTransaction } from '../../db';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const STRIPE_TOLERANCE_SECONDS = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS ?? 300);

type StripeEvent = {
  id: string;
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

type StripeCheckoutSessionObject = {
  id?: string;
  client_reference_id?: string;
  customer?: string;
  subscription?: string;
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

type StripeInvoiceObject = {
  id?: string;
  customer?: string;
  subscription?: string;
  period_start?: number;
  period_end?: number;
};

function parseStripeSignature(signatureHeader: string): { timestamp: number; signatures: string[] } {
  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .filter((part) => part.length > 0);

  if (!timestampPart || signatures.length === 0) {
    throw new Error('Invalid Stripe signature header');
  }

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) {
    throw new Error('Invalid Stripe signature header');
  }

  return { timestamp, signatures };
}

function verifyStripeSignature(rawBody: Buffer, signatureHeader: string): StripeEvent {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }

  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const digestBuffer = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(signedPayload).digest();

  const signatureIsValid = signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, 'hex');
    return signatureBuffer.length === digestBuffer.length && crypto.timingSafeEqual(digestBuffer, signatureBuffer);
  });

  if (!signatureIsValid) {
    throw new Error('Invalid Stripe signature');
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > STRIPE_TOLERANCE_SECONDS) {
    throw new Error('Stripe signature timestamp outside tolerance');
  }

  return JSON.parse(rawBody.toString('utf8')) as StripeEvent;
}

function toObject<T extends Record<string, unknown>>(value: unknown): T | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as T;
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

async function findSubscription(
  tx: Prisma.TransactionClient,
  filters: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    userId?: string;
  }
) {
  const where = {
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.stripeSubscriptionId ? { stripeSubscriptionId: filters.stripeSubscriptionId } : {}),
    ...(filters.stripeCustomerId ? { stripeCustomerId: filters.stripeCustomerId } : {})
  };

  if (Object.keys(where).length === 0) {
    return null;
  }

  return tx.subscription.findFirst({
    where,
    include: {
      plan: {
        select: {
          id: true,
          monthlyCredits: true
        }
      }
    }
  });
}

async function projectCheckoutCompleted(event: StripeEvent, tx: Prisma.TransactionClient): Promise<void> {
  const object = toObject<StripeCheckoutSessionObject>(event.data?.object);
  if (!object) {
    return;
  }

  const userId = typeof object.client_reference_id === 'string' ? object.client_reference_id : null;
  const stripeCustomerId = typeof object.customer === 'string' ? object.customer : null;
  const stripeSubscriptionId = typeof object.subscription === 'string' ? object.subscription : null;

  if (!userId || (!stripeCustomerId && !stripeSubscriptionId)) {
    return;
  }

  await tx.subscription.updateMany({
    where: { userId },
    data: {
      stripeCustomerId,
      stripeSubscriptionId,
      status: SubscriptionStatus.active,
      updatedAt: new Date()
    }
  });
}

async function projectSubscriptionEvent(event: StripeEvent, tx: Prisma.TransactionClient): Promise<void> {
  const subscriptionObj = toObject<StripeSubscriptionObject>(event.data?.object);
  if (!subscriptionObj || typeof subscriptionObj.customer !== 'string') {
    return;
  }

  const planId = await resolvePlanIdFromSubscription(subscriptionObj, tx);
  const status = event.type === 'customer.subscription.deleted'
    ? SubscriptionStatus.canceled
    : toSubscriptionStatus(subscriptionObj.status);

  await tx.subscription.updateMany({
    where: { stripeCustomerId: subscriptionObj.customer },
    data: {
      stripeSubscriptionId: typeof subscriptionObj.id === 'string' ? subscriptionObj.id : null,
      status,
      currentPeriodStart: unixToDate(subscriptionObj.current_period_start),
      currentPeriodEnd: unixToDate(subscriptionObj.current_period_end),
      cancelAtPeriodEnd: Boolean(subscriptionObj.cancel_at_period_end),
      planId,
      updatedAt: new Date()
    }
  });
}

async function grantRenewalCredits(
  event: StripeEvent,
  invoice: StripeInvoiceObject,
  subscription: Awaited<ReturnType<typeof findSubscription>>,
  tx: Prisma.TransactionClient
): Promise<void> {
  if (!subscription?.plan?.monthlyCredits) {
    return;
  }

  const periodStart = typeof invoice.period_start === 'number' ? invoice.period_start : undefined;
  const periodEnd = typeof invoice.period_end === 'number' ? invoice.period_end : undefined;
  const periodKey = periodStart && periodEnd ? `${periodStart}-${periodEnd}` : 'unknown-period';
  const subscriptionKey = subscription.stripeSubscriptionId ?? subscription.id;
  const renewalGrantKey = `stripe:renewal:${subscriptionKey}:${periodKey}:monthly-credits`;

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

  const invoiceId = typeof invoice.id === 'string' ? invoice.id : event.id;

  await applyCreditTransaction(
    {
      userId: subscription.userId,
      type: CreditTxnType.grant_monthly,
      amount: subscription.plan.monthlyCredits,
      metadata: {
        source: 'stripe.invoice.paid',
        stripeEventId: event.id,
        stripeInvoiceId: invoiceId,
        periodStart: periodStart ?? null,
        periodEnd: periodEnd ?? null,
        renewalGrantKey
      }
    },
    tx
  );
}

async function projectInvoicePaid(event: StripeEvent, tx: Prisma.TransactionClient): Promise<void> {
  const invoice = toObject<StripeInvoiceObject>(event.data?.object);
  if (!invoice || typeof invoice.customer !== 'string') {
    return;
  }

  const subscription = await findSubscription(tx, {
    stripeCustomerId: invoice.customer,
    stripeSubscriptionId: typeof invoice.subscription === 'string' ? invoice.subscription : undefined
  });

  if (!subscription) {
    return;
  }

  await tx.subscription.update({
    where: { id: subscription.id },
    data: {
      stripeSubscriptionId: typeof invoice.subscription === 'string' ? invoice.subscription : subscription.stripeSubscriptionId,
      status: SubscriptionStatus.active,
      currentPeriodStart: unixToDate(invoice.period_start) ?? subscription.currentPeriodStart,
      currentPeriodEnd: unixToDate(invoice.period_end) ?? subscription.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      updatedAt: new Date()
    }
  });

  await grantRenewalCredits(event, invoice, subscription, tx);
}

async function projectInvoicePaymentFailed(event: StripeEvent, tx: Prisma.TransactionClient): Promise<void> {
  const invoice = toObject<StripeInvoiceObject>(event.data?.object);
  if (!invoice || typeof invoice.customer !== 'string') {
    return;
  }

  const subscription = await findSubscription(tx, {
    stripeCustomerId: invoice.customer,
    stripeSubscriptionId: typeof invoice.subscription === 'string' ? invoice.subscription : undefined
  });

  if (!subscription) {
    return;
  }

  await tx.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.past_due,
      updatedAt: new Date()
    }
  });
}

async function projectSubscriptionState(event: StripeEvent, tx: Prisma.TransactionClient): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await projectCheckoutCompleted(event, tx);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await projectSubscriptionEvent(event, tx);
      break;
    case 'invoice.paid':
      await projectInvoicePaid(event, tx);
      break;
    case 'invoice.payment_failed':
      await projectInvoicePaymentFailed(event, tx);
      break;
    default:
      break;
  }
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
