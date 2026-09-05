export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  apiVersion?: string;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
  created: number;
  subscriptions: Subscription[];
}

export interface Subscription {
  id: string;
  customerId: string;
  status: "active" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "unpaid" | "trialing";
  planId: string;
  quantity: number;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  trialEnd?: number;
  metadata?: Record<string, string>;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
  features: PlanFeature[];
  metadata?: Record<string, string>;
}

export interface PlanFeature {
  name: string;
  value: string | number;
  unlimited?: boolean;
}

export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  periodStart: number;
  periodEnd: number;
  paymentIntent?: {
    id: string;
    status: string;
    clientSecret?: string;
  };
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
  created: number;
}

export interface CheckoutSession {
  id: string;
  url: string;
  customerId?: string;
  subscriptionId?: string;
  status: "open" | "complete" | "expired";
  mode: "payment" | "subscription" | "setup";
  successUrl: string;
  cancelUrl: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "For personal projects",
    amount: 0,
    currency: "usd",
    interval: "month",
    intervalCount: 1,
    features: [
      { name: "Devices", value: 5 },
      { name: "Data Retention", value: "7 days" },
      { name: "Dashboards", value: 2 },
      { name: "Alerts", value: 10 },
      { name: "API Requests", value: "1,000/day" },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "For small teams",
    amount: 2900,
    currency: "usd",
    interval: "month",
    intervalCount: 1,
    features: [
      { name: "Devices", value: 25 },
      { name: "Data Retention", value: "30 days" },
      { name: "Dashboards", value: 10 },
      { name: "Alerts", value: 100 },
      { name: "API Requests", value: "50,000/day" },
      { name: "AI Predictions", value: "Basic" },
      { name: "Support", value: "Email" },
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing businesses",
    amount: 9900,
    currency: "usd",
    interval: "month",
    intervalCount: 1,
    features: [
      { name: "Devices", value: 100 },
      { name: "Data Retention", value: "90 days" },
      { name: "Dashboards", value: 50 },
      { name: "Alerts", value: 500 },
      { name: "API Requests", value: "500,000/day" },
      { name: "AI Predictions", value: "Advanced" },
      { name: "Support", value: "Priority" },
      { name: "Webhooks", value: true },
      { name: "Custom Reports", value: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    amount: 49900,
    currency: "usd",
    interval: "month",
    intervalCount: 1,
    features: [
      { name: "Devices", value: "Unlimited", unlimited: true },
      { name: "Data Retention", value: "1 year" },
      { name: "Dashboards", value: "Unlimited", unlimited: true },
      { name: "Alerts", value: "Unlimited", unlimited: true },
      { name: "API Requests", value: "Unlimited", unlimited: true },
      { name: "AI Predictions", value: "Premium" },
      { name: "Support", value: "24/7 Dedicated" },
      { name: "Webhooks", value: true },
      { name: "Custom Reports", value: true },
      { name: "SSO", value: true },
      { name: "Audit Logs", value: true },
      { name: "SLA", value: "99.99%" },
    ],
  },
];

export class StripeService {
  private config: StripeConfig;
  private customers = new Map<string, Customer>();
  private subscriptions = new Map<string, Subscription>();
  private invoices = new Map<string, Invoice>();

  constructor(config: StripeConfig) {
    this.config = config;
  }

  getPlans(): Plan[] {
    return PLANS;
  }

  getPlan(planId: string): Plan | undefined {
    return PLANS.find((p) => p.id === planId);
  }

  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Customer> {
    const customer: Customer = {
      id: `cus_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      email,
      name,
      metadata,
      created: Math.floor(Date.now() / 1000),
      subscriptions: [],
    };

    this.customers.set(customer.id, customer);
    return customer;
  }

  async getCustomer(customerId: string): Promise<Customer | undefined> {
    return this.customers.get(customerId);
  }

  async createSubscription(
    customerId: string,
    planId: string,
    options?: {
      trialDays?: number;
      metadata?: Record<string, string>;
    }
  ): Promise<Subscription> {
    const customer = this.customers.get(customerId);
    if (!customer) throw new Error("Customer not found");

    const now = Math.floor(Date.now() / 1000);
    const periodEnd = now + 30 * 24 * 60 * 60;

    const subscription: Subscription = {
      id: `sub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      customerId,
      status: options?.trialDays ? "trialing" : "active",
      planId,
      quantity: 1,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      trialEnd: options?.trialDays ? now + options.trialDays * 24 * 60 * 60 : undefined,
      metadata: options?.metadata,
    };

    this.subscriptions.set(subscription.id, subscription);
    customer.subscriptions.push(subscription);

    return subscription;
  }

  async cancelSubscription(
    subscriptionId: string,
    immediate: boolean = false
  ): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    if (immediate) {
      subscription.status = "canceled";
    } else {
      subscription.cancelAtPeriodEnd = true;
    }

    return subscription;
  }

  async changePlan(
    subscriptionId: string,
    newPlanId: string
  ): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    subscription.planId = newPlanId;
    return subscription;
  }

  async createCheckoutSession(
    customerId: string,
    planId: string,
    options: {
      successUrl: string;
      cancelUrl: string;
    }
  ): Promise<CheckoutSession> {
    return {
      id: `cs_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      url: `https://checkout.stripe.com/pay/cs_${Date.now()}`,
      customerId,
      status: "open",
      mode: "subscription",
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
    };
  }

  async createInvoice(customerId: string): Promise<Invoice> {
    const invoice: Invoice = {
      id: `in_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      customerId,
      amount: 0,
      currency: "usd",
      status: "open",
      periodStart: Math.floor(Date.now() / 1000),
      periodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async getCustomerInvoices(customerId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (inv) => inv.customerId === customerId
    );
  }

  async handleWebhook(event: WebhookEvent): Promise<{ processed: boolean }> {
    switch (event.type) {
      case "customer.subscription.created": {
        const sub = event.data.object as Subscription;
        this.subscriptions.set(sub.id, sub);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Subscription;
        this.subscriptions.set(sub.id, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Subscription;
        this.subscriptions.delete(sub.id);
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Invoice;
        this.invoices.set(inv.id, inv);
        break;
      }
    }

    return { processed: true };
  }

  getUsage(customerId: string): {
    devices: number;
    apiCalls: number;
    storage: number;
  } {
    const customer = this.customers.get(customerId);
    if (!customer) {
      return { devices: 0, apiCalls: 0, storage: 0 };
    }

    const activeSub = customer.subscriptions.find((s) => s.status === "active");
    const plan = activeSub ? this.getPlan(activeSub.planId) : this.getPlan("free");

    return {
      devices: 0,
      apiCalls: 0,
      storage: 0,
    };
  }

  canPerformAction(
    customerId: string,
    action: string,
    currentUsage: number
  ): { allowed: boolean; limit: number; remaining: number } {
    const customer = this.customers.get(customerId);
    const activeSub = customer?.subscriptions.find((s) => s.status === "active");
    const plan = activeSub ? this.getPlan(activeSub.planId) : this.getPlan("free");

    if (!plan) {
      return { allowed: false, limit: 0, remaining: 0 };
    }

    const feature = plan.features.find((f) => f.name.toLowerCase() === action.toLowerCase());

    if (!feature) {
      return { allowed: false, limit: 0, remaining: 0 };
    }

    if (feature.unlimited) {
      return { allowed: true, limit: Infinity, remaining: Infinity };
    }

    if (typeof feature.value === "number") {
      return {
        allowed: currentUsage < feature.value,
        limit: feature.value,
        remaining: Math.max(0, feature.value - currentUsage),
      };
    }

    return { allowed: true, limit: Infinity, remaining: Infinity };
  }
}

export function createStripeService(config?: Partial<StripeConfig>): StripeService {
  return new StripeService({
    secretKey: config?.secretKey ?? process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: config?.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET ?? "",
    apiVersion: config?.apiVersion ?? "2023-10-16",
  });
}

export const stripeService = createStripeService();
