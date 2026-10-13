import 'server-only';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

type JsonObject = Record<string, unknown>;

export type TokenUsage = { input: number; output: number; total: number };
export type GenerateResult = {
  data: JsonObject;
  provider: string;
  model: string;
  usage: TokenUsage;
};

function emptyUsage(): TokenUsage {
  return { input: 0, output: 0, total: 0 };
}

function normalizeSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeSchema);
  if (!value || typeof value !== 'object') return value;
  const schema = value as Record<string, unknown>;
  const type = typeof schema.type === 'string' ? schema.type.toLowerCase() : schema.type;
  return Object.fromEntries(Object.entries({ ...schema, ...(type ? { type } : {}) }).map(([key, item]) => [key, normalizeSchema(item)]));
}

function validateResult(result: unknown, schema: JsonObject): JsonObject {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('AI provider returned invalid JSON object');
  const required = Array.isArray(schema.required) ? schema.required as string[] : [];
  if (required.some((key) => !(key in result))) throw new Error('AI provider response is missing required fields');
  return result as JsonObject;
}

async function withTimeout<T>(timeoutMs: number, action: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await action(controller.signal); } finally { clearTimeout(timer); }
}

function geminiUsage(meta: any): TokenUsage {
  const input = Number(meta?.promptTokenCount ?? meta?.prompt_token_count ?? 0) || 0;
  const output = Number(meta?.candidatesTokenCount ?? meta?.candidates_token_count ?? 0) || 0;
  const total = Number(meta?.totalTokenCount ?? meta?.total_token_count ?? input + output) || 0;
  return { input, output, total };
}

function geminiResponseText(response: { text?: string | null }): string {
  // SDK `.text` already excludes thought parts; still guard empty/whitespace.
  const text = typeof response.text === 'string' ? response.text.trim() : '';
  if (!text) throw new Error('Gemini returned empty structured output');
  return text;
}

function canRetryGeminiModel(message: string): boolean {
  return /not.?found|unsupported|404|429|rate.?limit|resource_exhausted|timeout|timed out|abort|empty structured|invalid json|unexpected token|missing required/i.test(message);
}

async function generateGemini(prompt: string, schema: JsonObject, timeoutMs: number): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const primary = process.env.GEMINI_MODEL;
  const fallback = process.env.GEMINI_FALLBACK_MODEL?.trim();
  if (!apiKey || !primary) throw new Error('Gemini provider is not configured');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } });
  const run = async (model: string): Promise<GenerateResult> => {
    let lastError: unknown;
    // Prefer minimal thinking (Gemini 3.x defaults to medium and often times out
    // under the 30s serverless cap). Fall back without thinkingConfig for older models.
    const configs: Array<Record<string, unknown>> = [
      {
        responseMimeType: 'application/json',
        responseSchema: schema as any,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
      {
        responseMimeType: 'application/json',
        responseSchema: schema as any,
      },
    ];
    for (const config of configs) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({ model, contents: prompt, config: config as any });
          return {
            data: validateResult(JSON.parse(geminiResponseText(response)), schema),
            provider: 'gemini',
            model,
            usage: geminiUsage((response as any).usageMetadata),
          };
        } catch (error) {
          lastError = error;
          const message = String((error as any)?.message || error);
          // If this model rejects thinkingLevel, skip straight to the no-thinking config.
          if (config.thinkingConfig && /thinking|invalid.?argument|400/i.test(message)) break;
        }
      }
    }
    throw lastError;
  };
  try {
    return await run(primary);
  } catch (error: any) {
    const message = String(error?.message || error);
    if (fallback && fallback !== primary && canRetryGeminiModel(message)) {
      console.warn(`[ai-provider] gemini ${primary} failed; trying GEMINI_FALLBACK_MODEL=${fallback}. ${message}`);
      return run(fallback);
    }
    throw error;
  }
}

async function generateOpenAI(prompt: string, schema: JsonObject, timeoutMs: number): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const primary = process.env.OPENAI_MODEL;
  const fallback = process.env.OPENAI_FALLBACK_MODEL?.trim();
  if (!apiKey || !primary) throw new Error('OpenAI provider is not configured');

  const run = async (model: string): Promise<GenerateResult> =>
    withTimeout(timeoutMs, async (signal) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: `${prompt}\n\nReturn a JSON object matching this schema: ${JSON.stringify(normalizeSchema(schema))}` }],
          response_format: { type: 'json_object' },
        }),
      });
      if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('OpenAI returned no JSON content');
      const usage = payload?.usage;
      return {
        data: validateResult(JSON.parse(content), schema),
        provider: 'openai',
        model,
        usage: {
          input: Number(usage?.prompt_tokens || 0) || 0,
          output: Number(usage?.completion_tokens || 0) || 0,
          total: Number(usage?.total_tokens || 0) || 0,
        },
      };
    });

  try {
    return await run(primary);
  } catch (error: any) {
    const message = String(error?.message || error);
    const canFallback = Boolean(fallback) && fallback !== primary
      && /not.?found|unsupported|404|429|rate.?limit|capacity|overloaded/i.test(message);
    if (canFallback) {
      console.warn(`[ai-provider] openai ${primary} failed; trying OPENAI_FALLBACK_MODEL=${fallback}. ${message}`);
      return run(fallback!);
    }
    throw error;
  }
}

async function generateAnthropic(prompt: string, schema: JsonObject, timeoutMs: number): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) throw new Error('Anthropic provider is not configured');
  return withTimeout(timeoutMs, async (signal) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS || 4096), messages: [{ role: 'user', content: prompt }], tools: [{ name: 'emit_result', description: 'Return the requested structured result.', input_schema: normalizeSchema(schema) }], tool_choice: { type: 'tool', name: 'emit_result' } }),
    });
    if (!response.ok) throw new Error(`Anthropic request failed (${response.status})`);
    const payload = await response.json();
    const result = payload?.content?.find((item: { type?: string }) => item.type === 'tool_use')?.input;
    const input = Number(payload?.usage?.input_tokens || 0) || 0;
    const output = Number(payload?.usage?.output_tokens || 0) || 0;
    return {
      data: validateResult(result, schema),
      provider: 'anthropic',
      model,
      usage: { input, output, total: input + output },
    };
  });
}

/** Groq OpenAI-compatible chat completions (configured fallback after Gemini). */
async function generateGroq(prompt: string, schema: JsonObject, timeoutMs: number): Promise<GenerateResult> {
  const apiKey = process.env.GROQ_API_KEY;
  const primary = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const fallback = process.env.GROQ_FALLBACK_MODEL?.trim();
  if (!apiKey) throw new Error('Groq provider is not configured');

  const run = async (model: string): Promise<GenerateResult> =>
    withTimeout(timeoutMs, async (signal) => {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: `${prompt}\n\nReturn a JSON object matching this schema: ${JSON.stringify(normalizeSchema(schema))}` }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });
      if (!response.ok) throw new Error(`Groq request failed (${response.status})`);
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Groq returned no JSON content');
      const usage = payload?.usage;
      return {
        data: validateResult(JSON.parse(content), schema),
        provider: 'groq',
        model,
        usage: {
          input: Number(usage?.prompt_tokens || 0) || 0,
          output: Number(usage?.completion_tokens || 0) || 0,
          total: Number(usage?.total_tokens || 0) || 0,
        },
      };
    });

  try {
    return await run(primary);
  } catch (error: any) {
    const message = String(error?.message || error);
    const canFallback = Boolean(fallback) && fallback !== primary
      && /not.?found|unsupported|404|429|rate.?limit|capacity|overloaded/i.test(message);
    if (canFallback) {
      console.warn(`[ai-provider] groq ${primary} failed; trying GROQ_FALLBACK_MODEL=${fallback}. ${message}`);
      return run(fallback!);
    }
    throw error;
  }
}

function isConfigured(provider: string) {
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL);
  if (provider === 'groq') return Boolean(process.env.GROQ_API_KEY);
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
  if (provider === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL);
  return false;
}

/** Provider-neutral structured JSON generation with ordered failover across configured providers. */
export async function generateStructuredJson(prompt: string, schema: JsonObject, timeoutMs = 25_000): Promise<GenerateResult> {
  const primary = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  // Preferred: Gemini primary, Groq fallback. Optional OpenAI/Anthropic remain env-gated.
  const priority = (process.env.AI_PROVIDER_PRIORITY || `${primary},groq,openai,anthropic`)
    .split(',').map((item) => item.trim().toLowerCase()).filter((item, index, all) => item && all.indexOf(item) === index);
  const providers = priority.filter(isConfigured);
  if (!providers.length) throw new Error('No AI providers in AI_PROVIDER_PRIORITY are fully configured');

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      if (provider === 'gemini') return await generateGemini(prompt, schema, timeoutMs);
      if (provider === 'groq') return await generateGroq(prompt, schema, timeoutMs);
      if (provider === 'openai') return await generateOpenAI(prompt, schema, timeoutMs);
      if (provider === 'anthropic') return await generateAnthropic(prompt, schema, timeoutMs);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown provider error';
      errors.push(`${provider}: ${reason}`);
      console.warn(`[ai-provider] ${provider} failed; trying next configured provider. ${reason}`);
    }
  }
  throw new Error(`All configured AI providers failed. ${errors.join(' | ')}`);
}

export { emptyUsage };
