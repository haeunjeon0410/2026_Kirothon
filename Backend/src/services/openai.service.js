const OpenAI = require('openai');

/**
 * OpenAI Service
 *
 * Low-level wrapper around the OpenAI API.
 * Provides fallback-safe architecture: if the API key is missing or the call fails,
 * returns null gracefully so the deterministic engine remains the source of truth.
 */

let _client = null;

/**
 * Get or create the OpenAI client. Returns null if no API key is configured.
 */
function getClient() {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
    return null;
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

/**
 * Check if OpenAI is available (API key configured).
 */
function isAvailable() {
  return getClient() !== null;
}

/**
 * Send a chat completion request. Returns the response text or null on failure.
 *
 * @param {Object} options
 *   - systemPrompt: string
 *   - userPrompt: string
 *   - model: string (optional, defaults to env OPENAI_MODEL or gpt-4o-mini)
 *   - maxTokens: number (optional, default 1000)
 *   - temperature: number (optional, default 0.7)
 * @returns {string|null} Response text or null if unavailable/failed
 */
async function chat({ systemPrompt, userPrompt, model, maxTokens = 1000, temperature = 0.7 }) {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    return response.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.warn('[openai] API call failed:', error.message);
    return null;
  }
}

/**
 * Send a structured JSON response request.
 * Asks GPT to respond in JSON format and parses the result.
 *
 * @returns {Object|null} Parsed JSON or null on failure
 */
async function chatJSON({ systemPrompt, userPrompt, model, maxTokens = 1500, temperature = 0.5 }) {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt + '\n\nRespond ONLY with valid JSON. No markdown, no code blocks.' },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
    });

    const text = response.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.warn('[openai] JSON API call failed:', error.message);
    return null;
  }
}

module.exports = {
  getClient,
  isAvailable,
  chat,
  chatJSON,
};
