export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage?: number;
  variants?: FeatureVariant[];
  rules?: FeatureRule[];
  metadata?: Record<string, unknown>;
}

export interface FeatureVariant {
  key: string;
  name: string;
  weight: number;
  payload?: unknown;
}

export interface FeatureRule {
  conditions: FeatureCondition[];
  variant?: string;
  percentage?: number;
}

export interface FeatureCondition {
  attribute: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "contains" | "starts_with" | "ends_with";
  value: unknown;
}

export interface FeatureFlagContext {
  userId?: string;
  email?: string;
  plan?: string;
  country?: string;
  attributes?: Record<string, unknown>;
}

interface FeatureFlagOverride {
  key: string;
  enabled: boolean;
  variant?: string;
  expiresAt?: number;
}

export class FeatureFlagService {
  private flags = new Map<string, FeatureFlag>();
  private overrides: FeatureFlagOverride[] = [];
  private context: FeatureFlagContext = {};
  private environment: string;

  constructor(environment: string = "development") {
    this.environment = environment;
    this.loadDefaults();
  }

  private loadDefaults(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        key: "ai_predictions",
        name: "AI Predictions",
        description: "Enable AI-powered predictions for device data",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        key: "anomaly_detection",
        name: "Anomaly Detection",
        description: "Enable real-time anomaly detection",
        enabled: true,
        rolloutPercentage: 80,
      },
      {
        key: "mqtt_protocol",
        name: "MQTT Protocol",
        description: "Enable MQTT protocol support",
        enabled: true,
      },
      {
        key: "advanced_analytics",
        name: "Advanced Analytics",
        description: "Enable advanced analytics dashboard",
        enabled: false,
        rolloutPercentage: 25,
      },
      {
        key: "export_reports",
        name: "Export Reports",
        description: "Enable report export functionality",
        enabled: true,
      },
      {
        key: "real_time_alerts",
        name: "Real-Time Alerts",
        description: "Enable real-time alert notifications",
        enabled: true,
      },
      {
        key: "custom_widgets",
        name: "Custom Widgets",
        description: "Enable custom dashboard widgets",
        enabled: false,
        rolloutPercentage: 10,
      },
      {
        key: "api_rate_limiting",
        name: "API Rate Limiting",
        description: "Enable API rate limiting",
        enabled: true,
      },
      {
        key: "dark_mode",
        name: "Dark Mode",
        description: "Enable dark mode UI",
        enabled: true,
      },
      {
        key: "mobile_view",
        name: "Mobile View",
        description: "Enable mobile-optimized view",
        enabled: true,
      },
    ];

    for (const flag of defaultFlags) {
      this.flags.set(flag.key, flag);
    }
  }

  setContext(context: FeatureFlagContext): void {
    this.context = { ...this.context, ...context };
  }

  isEnabled(key: string, context?: FeatureFlagContext): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;

    const override = this.overrides.find((o) => o.key === key);
    if (override) {
      if (override.expiresAt && Date.now() > override.expiresAt) {
        this.overrides = this.overrides.filter((o) => o.key !== key);
      } else {
        return override.enabled;
      }
    }

    if (!flag.enabled) return false;

    if (flag.rules && flag.rules.length > 0) {
      const evalContext = { ...this.context, ...context };
      const matchedRule = this.evaluateRules(flag.rules, evalContext);
      if (matchedRule) {
        return true;
      }
    }

    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const evalContext = { ...this.context, ...context };
      const hash = this.hashString(
        `${key}:${evalContext.userId ?? "anonymous"}`
      );
      const bucket = hash % 100;
      return bucket < flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  getVariant(key: string, context?: FeatureFlagContext): string | null {
    const flag = this.flags.get(key);
    if (!flag || !flag.enabled || !flag.variants || flag.variants.length === 0) {
      return null;
    }

    const override = this.overrides.find(
      (o) => o.key === key && o.variant
    );
    if (override) return override.variant!;

    const evalContext = { ...this.context, ...context };
    const hash = this.hashString(
      `${key}:variant:${evalContext.userId ?? "anonymous"}`
    );
    const bucket = hash % 100;

    let cumulative = 0;
    for (const variant of flag.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant.key;
      }
    }

    return flag.variants[0].key;
  }

  getPayload<T = unknown>(key: string, context?: FeatureFlagContext): T | null {
    const variant = this.getVariant(key, context);
    if (!variant) return null;

    const flag = this.flags.get(key);
    const variantObj = flag?.variants?.find((v) => v.key === variant);
    return (variantObj?.payload as T) ?? null;
  }

  private evaluateRules(
    rules: FeatureRule[],
    context: FeatureFlagContext
  ): FeatureRule | null {
    for (const rule of rules) {
      const allConditionsMet = rule.conditions.every((condition) =>
        this.evaluateCondition(condition, context)
      );

      if (allConditionsMet) {
        return rule;
      }
    }

    return null;
  }

  private evaluateCondition(
    condition: FeatureCondition,
    context: FeatureFlagContext
  ): boolean {
    let attributeValue: unknown;

    if (condition.attribute === "userId") {
      attributeValue = context.userId;
    } else if (condition.attribute === "email") {
      attributeValue = context.email;
    } else if (condition.attribute === "plan") {
      attributeValue = context.plan;
    } else if (condition.attribute === "country") {
      attributeValue = context.country;
    } else if (context.attributes) {
      attributeValue = context.attributes[condition.attribute];
    } else {
      return false;
    }

    switch (condition.operator) {
      case "eq":
        return attributeValue === condition.value;
      case "neq":
        return attributeValue !== condition.value;
      case "gt":
        return (attributeValue as number) > (condition.value as number);
      case "gte":
        return (attributeValue as number) >= (condition.value as number);
      case "lt":
        return (attributeValue as number) < (condition.value as number);
      case "lte":
        return (attributeValue as number) <= (condition.value as number);
      case "in":
        return (condition.value as unknown[]).includes(attributeValue);
      case "nin":
        return !(condition.value as unknown[]).includes(attributeValue);
      case "contains":
        return String(attributeValue).includes(String(condition.value));
      case "starts_with":
        return String(attributeValue).startsWith(String(condition.value));
      case "ends_with":
        return String(attributeValue).endsWith(String(condition.value));
      default:
        return false;
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  override(key: string, enabled: boolean, variant?: string, expiresAt?: number): void {
    this.overrides = this.overrides.filter((o) => o.key !== key);
    this.overrides.push({ key, enabled, variant, expiresAt });
  }

  clearOverride(key: string): void {
    this.overrides = this.overrides.filter((o) => o.key !== key);
  }

  clearAllOverrides(): void {
    this.overrides = [];
  }

  getAllFlags(context?: FeatureFlagContext): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [key] of this.flags) {
      result[key] = this.isEnabled(key, context);
    }
    return result;
  }

  getFlagDetails(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  addFlag(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
  }

  removeFlag(key: string): boolean {
    return this.flags.delete(key);
  }

  updateFlag(key: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;

    this.flags.set(key, { ...flag, ...updates });
    return true;
  }
}

export function createFeatureFlagService(
  environment?: string
): FeatureFlagService {
  return new FeatureFlagService(
    environment ?? process.env.NODE_ENV ?? "development"
  );
}

export const featureFlags = createFeatureFlagService();

export function useFeatureFlag(key: string): boolean {
  return featureFlags.isEnabled(key);
}

export function useFeatureVariant(key: string): string | null {
  return featureFlags.getVariant(key);
}
