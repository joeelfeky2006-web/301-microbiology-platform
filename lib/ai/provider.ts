import 'server-only';
import { GoogleGenAI } from '@google/genai';

type JsonObject = Record<string, unknown>;

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

async function generateGemini(prompt: string, schema: JsonObject, timeoutMs: number): Promise<JsonObject> {
  const apiKey = process.env.GEMINI_API_KEY;
  const primary = process.env.GEMINI_MODEL;
  if (!apiKey || !primary) throw new Error('Gemini provider is not configured');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } });
  const run = async (model: string) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema as any } });
        return validateResult(JSON.parse(response.text || ''), schema);
      } catch (error) { lastError = error; }
    }
    throw lastError;
  };
  try { return await run(primary); }
  catch (error: any) {
    if (process.env.GEMINI_FALLBACK_MODEL && /not.?found|unsupported|404/i.test(String(error?.message || error))) return run(process.env.GEMINI_FALLBACK_MODEL);
    throw error;
  }
}

async function generateOpenAI(prompt: string, schema: JsonObject, timeoutMs: number): Promise<JsonObject> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error('OpenAI provider is not configured');
  return withTimeout(timeoutMs, async (signal) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: `${prompt}\n\nReturn a JSON object matching this schema: ${JSON.stringify(normalizeSchema(schema))}` }], response_format: { type: 'json_object' } }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('OpenAI returned no JSON content');
    return validateResult(JSON.parse(content), schema);
  });
}

async function generateAnthropic(prompt: string, schema: JsonObject, timeoutMs: number): Promise<JsonObject> {
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
    return validateResult(result, schema);
  });
}

/** Provider-neutral structured JSON generation. Set AI_PROVIDER to gemini, openai, or anthropic. */
export async function generateStructuredJson(prompt: string, schema: JsonObject, timeoutMs = 25_000): Promise<JsonObject> {
  switch ((process.env.AI_PROVIDER || 'gemini').trim().toLowerCase()) {
    case 'gemini': return generateGemini(prompt, schema, timeoutMs);
    case 'openai': return generateOpenAI(prompt, schema, timeoutMs);
    case 'anthropic': return generateAnthropic(prompt, schema, timeoutMs);
    default: throw new Error('Unsupported AI_PROVIDER. Use gemini, openai, or anthropic.');
  }
}
