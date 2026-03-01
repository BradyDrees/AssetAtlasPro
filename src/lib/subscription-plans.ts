export const SUBSCRIPTION_PLANS = {
  essential: {
    name: "Essential",
    monthly_amount: 49.0,
    pool_deposit_amount: 35.0,
    platform_fee_amount: 14.0,
    warranty_days: 30,
    priority_routing: false,
    emergency_access: false,
  },
  standard: {
    name: "Standard",
    monthly_amount: 99.0,
    pool_deposit_amount: 75.0,
    platform_fee_amount: 24.0,
    warranty_days: 30,
    priority_routing: true,
    emergency_access: true,
  },
  premium: {
    name: "Premium",
    monthly_amount: 179.0,
    pool_deposit_amount: 140.0,
    platform_fee_amount: 39.0,
    warranty_days: 60,
    priority_routing: true,
    emergency_access: true,
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;
