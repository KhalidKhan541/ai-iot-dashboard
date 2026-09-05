/**
 * Multi-provider AI client supporting OpenAI, Anthropic, and Gemini.
 * Provides a unified interface for streaming and non-streaming completions,
 * with automatic retries, token counting, and cost tracking.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type AIProvider = "openai" | "anthropic" | "gemini";

export type AIRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AICompletionOptions {
  provider?: AIProvider;
  model?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface AICompletionResult {
  id: string;
  provider: AIProvider;
  model: string;
  content: string;
  finishReason: string;
  usage: TokenUsage;
  latencyMs: number;
  cached: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIClientConfig {
  providers: Partial<Record<AIProvider, ProviderConfig>>;
  defaultProvider: AIProvider;
  retryAttempts: number;
  retryDelayMs: number;
  cacheEnabled: boolean;
  cacheTtlMs: number;
  costTrackingEnabled: boolean;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  defaultModel?: string;
}

export interface CostRecord {
  id: string;
  provider: AIProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  timestamp: Date;
}

// ── Pricing (USD per 1K tokens) ──────────────────────────────────────────────

const PRICING: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o": { prompt: 0.0025, completion: 0.01 },
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
  "claude-3-5-sonnet-20241022": { prompt: 0.003, completion: 0.015 },
  "claude-3-5-haiku-20241022": { prompt: 0.0008, completion: 0.004 },
  "gemini-1.5-pro": { prompt: 0.00125, completion: 0.005 },
  "gemini-1.5-flash": { prompt: 0.000075, completion: 0.0003 },
};

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-20241022",
  gemini: "gemini-1.5-flash",
};

// ── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry {
  result: AICompletionResult;
  expiresAt: number;
}

function hashMessages(messages: AIMessage[], model: string): string {
  const payload = JSON.stringify({ messages, model });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

// ── AIClient ─────────────────────────────────────────────────────────────────

export class AIClient {
  private config: AIClientConfig;
  private cache = new Map<string, CacheEntry>();
  private costs: CostRecord[] = [];

  constructor(config: Partial<AIClientConfig> & { providers: Partial<Record<AIProvider, ProviderConfig>> }) {
    this.config = {
      defaultProvider: config.defaultProvider ?? "openai",
      retryAttempts: config.retryAttempts ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTtlMs: config.cacheTtlMs ?? 5 * 60 * 1000,
      costTrackingEnabled: config.costTrackingEnabled ?? true,
      providers: config.providers,
    };
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const provider = options.provider ?? this.config.defaultProvider;
    const model = options.model ?? DEFAULT_MODELS[provider];

    if (this.config.cacheEnabled && !options.stream) {
      const cached = this.getFromCache(model, options.messages);
      if (cached) return cached;
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const start = Date.now();
        const result = await this.callProvider(provider, model, options);
        result.latencyMs = Date.now() - start;

        if (this.config.costTrackingEnabled) {
          this.trackCost(result);
        }
        if (this.config.cacheEnabled && !options.stream) {
          this.setCache(model, options.messages, result);
        }
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
      }
    }
    throw new Error(`AI completion failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
  }

  async chat(
    messages: AIMessage[],
    opts: Partial<Omit<AICompletionOptions, "messages">> = {}
  ): Promise<string> {
    const result = await this.complete({ messages, ...opts });
    return result.content;
  }

  async *stream(options: AICompletionOptions): AsyncGenerator<string> {
    const provider = options.provider ?? this.config.defaultProvider;
    const model = options.model ?? DEFAULT_MODELS[provider];

    const response = await this.fetchStream(provider, model, options);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const token = this.extractStreamToken(provider, parsed);
              if (token) {
                options.onChunk?.(token);
                yield token;
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async callProvider(
    provider: AIProvider,
    model: string,
    options: AICompletionOptions
  ): Promise<AICompletionResult> {
    const config = this.config.providers[provider];
    if (!config?.apiKey) throw new Error(`No API key configured for ${provider}`);

    const id = crypto.randomUUID();

    if (provider === "openai") {
      return this.callOpenAI(id, model, config, options);
    }
    if (provider === "anthropic") {
      return this.callAnthropic(id, model, config, options);
    }
    if (provider === "gemini") {
      return this.callGemini(id, model, config, options);
    }
    throw new Error(`Unknown provider: ${provider}`);
  }

  private async callOpenAI(
    id: string,
    model: string,
    config: ProviderConfig,
    options: AICompletionOptions
  ): Promise<AICompletionResult> {
    const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    const body: Record<string, unknown> = {
      model,
      messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.frequencyPenalty !== undefined) body.frequency_penalty = options.frequencyPenalty;
    if (options.presencePenalty !== undefined) body.presence_penalty = options.presencePenalty;
    if (options.stop) body.stop = options.stop;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...(config.organization ? { "OpenAI-Organization": config.organization } : {}),
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      id,
      provider: "openai",
      model: data.model ?? model,
      content: choice?.message?.content ?? "",
      finishReason: choice?.finish_reason ?? "unknown",
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      latencyMs: 0,
      cached: false,
    };
  }

  private async callAnthropic(
    id: string,
    model: string,
    config: ProviderConfig,
    options: AICompletionOptions
  ): Promise<AICompletionResult> {
    const baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1";
    const systemMsg = options.messages.find((m) => m.role === "system");
    const nonSystemMsgs = options.messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      model,
      messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    };
    if (systemMsg) body.system = systemMsg.content;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.stop) body.stop_sequences = options.stop;

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === "text");

    return {
      id,
      provider: "anthropic",
      model: data.model ?? model,
      content: textBlock?.text ?? "",
      finishReason: data.stop_reason ?? "unknown",
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      latencyMs: 0,
      cached: false,
    };
  }

  private async callGemini(
    id: string,
    model: string,
    config: ProviderConfig,
    options: AICompletionOptions
  ): Promise<AICompletionResult> {
    const baseUrl = config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    const contents = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemMsg = options.messages.find((m) => m.role === "system");
    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
        ...(options.topP !== undefined ? { topP: options.topP } : {}),
      },
    };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: options.signal,
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const usage = data.usageMetadata ?? {};

    return {
      id,
      provider: "gemini",
      model,
      content: text,
      finishReason: data.candidates?.[0]?.finishReason ?? "unknown",
      usage: {
        promptTokens: usage.promptTokenCount ?? 0,
        completionTokens: usage.candidatesTokenCount ?? 0,
        totalTokens: usage.totalTokenCount ?? 0,
      },
      latencyMs: 0,
      cached: false,
    };
  }

  private async fetchStream(
    provider: AIProvider,
    model: string,
    options: AICompletionOptions
  ): Promise<Response> {
    const config = this.config.providers[provider];
    if (!config?.apiKey) throw new Error(`No API key configured for ${provider}`);

    if (provider === "openai") {
      const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
      return fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: true,
        }),
        signal: options.signal,
      });
    }

    if (provider === "anthropic") {
      const baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1";
      const systemMsg = options.messages.find((m) => m.role === "system");
      const nonSystemMsgs = options.messages.filter((m) => m.role !== "system");
      const body: Record<string, unknown> = {
        model,
        messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      };
      if (systemMsg) body.system = systemMsg.content;

      return fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        signal: options.signal,
      });
    }

    throw new Error(`Streaming not implemented for ${provider}`);
  }

  private extractStreamToken(provider: AIProvider, parsed: Record<string, unknown>): string | null {
    if (provider === "openai") {
      return (parsed as { choices?: { delta?: { content?: string } }[] })
        .choices?.[0]?.delta?.content ?? null;
    }
    if (provider === "anthropic") {
      const evt = parsed as { type?: string; delta?: { text?: string } };
      if (evt.type === "content_block_delta") return evt.delta?.text ?? null;
      return null;
    }
    return null;
  }

  private getFromCache(model: string, messages: AIMessage[]): AICompletionResult | null {
    const key = hashMessages(messages, model);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return { ...entry.result, cached: true };
  }

  private setCache(model: string, messages: AIMessage[], result: AICompletionResult): void {
    const key = hashMessages(messages, model);
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.config.cacheTtlMs,
    });
  }

  private trackCost(result: AICompletionResult): void {
    const pricing = PRICING[result.model];
    if (!pricing) return;
    const costUsd =
      (result.usage.promptTokens / 1000) * pricing.prompt +
      (result.usage.completionTokens / 1000) * pricing.completion;
    this.costs.push({
      id: crypto.randomUUID(),
      provider: result.provider,
      model: result.model,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      estimatedCostUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
      timestamp: new Date(),
    });
  }

  getCosts(): CostRecord[] {
    return [...this.costs];
  }

  getTotalCost(): number {
    return this.costs.reduce((sum, c) => sum + c.estimatedCostUsd, 0);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

let defaultClient: AIClient | null = null;

export function createAIClient(config: Partial<AIClientConfig> & { providers: Partial<Record<AIProvider, ProviderConfig>> }): AIClient {
  return new AIClient(config);
}

export function getAIClient(): AIClient {
  if (!defaultClient) {
    defaultClient = new AIClient({
      providers: {
        openai: { apiKey: process.env.OPENAI_API_KEY ?? "" },
        anthropic: { apiKey: process.env.ANTHROPIC_API_KEY ?? "" },
        gemini: { apiKey: process.env.GEMINI_API_KEY ?? "" },
      },
      defaultProvider: "openai",
    });
  }
  return defaultClient;
}
