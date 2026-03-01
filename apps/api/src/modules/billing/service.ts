import { SubscriptionStatus } from '@prisma/client';
import {
  BillingPlansResponseSchema,
  BillingSubscriptionResponseSchema,
  CheckoutSessionResponseSchema,
  PortalSessionResponseSchema,
  type CheckoutSessionRequestDto
} from '@shorts/shared-types';

import { db } from '../../db';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const BILLING_SUCCESS_PATH = process.env.STRIPE_CHECKOUT_SUCCESS_PATH ?? '/billing/success';
const BILLING_CANCEL_PATH = process.env.STRIPE_CHECKOUT_CANCEL_PATH ?? '/billing/cancel';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function requireUuid(value: string, fieldName: string): void {
  if (!isUuid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }
}

function buildCheckoutUrl(stripePriceId: string, userId: string): string {
  const checkoutUrl = new URL('/billing/checkout', APP_URL);
  checkoutUrl.searchParams.set('price', stripePriceId);
  checkoutUrl.searchParams.set('client_reference_id', userId);
  checkoutUrl.searchParams.set('success_url', new URL(BILLING_SUCCESS_PATH, APP_URL).toString());
  checkoutUrl.searchParams.set('cancel_url', new URL(BILLING_CANCEL_PATH, APP_URL).toString());

  return checkoutUrl.toString();
}

function buildPortalUrl(stripeCustomerId: string): string {
  const portalUrl = new URL('/billing/portal', APP_URL);
  portalUrl.searchParams.set('customer', stripeCustomerId);
  portalUrl.searchParams.set('return_url', new URL('/billing', APP_URL).toString());

  return portalUrl.toString();
}

export const billingService = {
  async plans() {
    const items = await db.plan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, monthlyCredits: true },
      orderBy: { monthlyCredits: 'asc' }
    });

    return BillingPlansResponseSchema.parse({ items });
  },

  async checkoutSession(userId: string, payload: CheckoutSessionRequestDto) {
    requireUuid(userId, 'user id');
    requireUuid(payload.planId, 'plan id');

    const plan = await db.plan.findFirst({
      where: { id: payload.planId, isActive: true },
      select: { stripePriceId: true }
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    if (!plan.stripePriceId) {
      throw new Error('Plan does not support Stripe checkout');
    }

    return CheckoutSessionResponseSchema.parse({
      url: buildCheckoutUrl(plan.stripePriceId, userId)
    });
  },

  async portalSession(userId: string) {
    requireUuid(userId, 'user id');

    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true }
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found for user');
    }

    return PortalSessionResponseSchema.parse({
      url: buildPortalUrl(subscription.stripeCustomerId)
    });
  },

  async subscription(userId: string) {
    if (!isUuid(userId)) {
      return BillingSubscriptionResponseSchema.parse({ status: SubscriptionStatus.inactive, planId: null });
    }

    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { status: true, planId: true }
    });

    return BillingSubscriptionResponseSchema.parse({
      status: subscription?.status ?? SubscriptionStatus.inactive,
      planId: subscription?.planId ?? null
    });
  }
};
