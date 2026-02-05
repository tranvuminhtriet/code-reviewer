import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMOptions,
} from "./types.js";

export class GoogleGenAIProvider implements LLMProvider {
  public readonly name = "google-genai";
  private client: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(config: { apiKey?: string; model?: string }) {
    // Use provided API key or fall back to environment variable
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY || "";

    if (!apiKey) {
      throw new Error(
        "Google GenAI API key is required. Set GEMINI_API_KEY in .env or pass apiKey in config.",
      );
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.defaultModel = config.model || "gemini-1.5-flash";
  }

  async chat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<LLMResponse> {
    try {
      // Get the model
      const modelName = options?.model || this.defaultModel;
      const model = this.client.getGenerativeModel({ model: modelName });

      // Convert messages array to prompt format
      const prompt = this.formatMessages(messages);

      // Adjust temperature range: OpenAI uses 0-2, Gemini uses 0-2 (same range actually)
      // But Gemini's default is 1.0, OpenAI's is 0.7
      const temperature = options?.temperature ?? 0.7;

      // Generate content
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: options?.maxTokens,
        },
      });

      const response = result.response;
      const text = response.text();

      // Estimate token usage (Gemini provides usage metadata)
      const usage = response.usageMetadata;
      const tokenUsage = usage
        ? {
            promptTokens: usage.promptTokenCount || 0,
            completionTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0,
          }
        : this.estimateTokens(prompt, text);

      return {
        content: text,
        usage: tokenUsage,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Google GenAI API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Convert OpenAI-style messages to a single prompt
   */
  private formatMessages(messages: LLMMessage[]): string {
    return messages
      .map((msg) => {
        if (msg.role === "system") {
          return `System Instructions:\n${msg.content}`;
        } else if (msg.role === "user") {
          return `User:\n${msg.content}`;
        } else if (msg.role === "assistant") {
          return `Assistant:\n${msg.content}`;
        }
        return msg.content;
      })
      .join("\n\n---\n\n");
  }

  /**
   * Estimate token usage (fallback if API doesn't provide it)
   */
  private estimateTokens(prompt: string, response: string) {
    // Rough estimation: ~4 characters per token
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(response.length / 4);

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }
}
