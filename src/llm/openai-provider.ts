import OpenAI from "openai";
import type {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMOptions,
} from "./types.js";

export class OpenAIProvider implements LLMProvider {
  public readonly name = "openai";
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: { apiKey?: string; model?: string }) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";

    if (!apiKey) {
      throw new Error(
        "OpenAI API key is required. Set OPENAI_API_KEY in .env or pass apiKey in config.",
      );
    }

    this.client = new OpenAI({
      apiKey,
    });
    this.defaultModel = config.model || "gpt-4-turbo-preview";
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message.content) {
        throw new Error("No response from OpenAI");
      }

      return {
        content: choice.message.content,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }
}
