// The client does not export this type from its index
import type { NLSearchModelCreateSchema } from 'typesense/lib/Typesense/NLSearchModels.js'
import { buildSystemPrompt } from './system-prompt.ts'

export const nlModelId = 'claude'

/**
 * Claude, through Anthropic's OpenAI-compatible endpoint: Typesense's natural language search
 * speaks the OpenAI chat completions API to any `openai/` model, at the `api_url` it is given.
 *
 * The model is Claude Sonnet 4.6. Typesense checks a model when it registers it with a test call
 * that sets `temperature` to 0, and Claude 4.7 and later models reject a temperature below 1
 * through this endpoint, so a later model cannot be registered with this Typesense version.
 */
export function nlModelConfig(anthropicApiKey: string): NLSearchModelCreateSchema {
  return {
    id: nlModelId,
    model_name: 'openai/claude-sonnet-4-6',
    api_url: 'https://api.anthropic.com/v1/chat/completions',
    api_key: anthropicApiKey,
    // The most the model may answer with, which Typesense sends as max_tokens
    max_bytes: 16000,
    temperature: 0,
    system_prompt: buildSystemPrompt(),
  }
}
