import { config as loadEnv } from "dotenv";
import type { PipelineConfig } from "../pipeline/types.js";

// Load environment variables
loadEnv();

export function getDefaultConfig(): PipelineConfig {
  return {
    llm: {
      provider: (process.env.LLM_PROVIDER as any) || "openai",
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
    },
    agents: {
      codeReview: {
        enabled: process.env.ENABLE_CODE_REVIEW !== "false",
      },
      security: {
        enabled: process.env.ENABLE_SECURITY !== "false",
      },
      performance: {
        enabled: process.env.ENABLE_PERFORMANCE !== "false",
      },
    },
    output: {
      formats: (process.env.OUTPUT_FORMATS?.split(",") as any) || [
        "markdown",
        "html",
      ],
      directory: process.env.OUTPUT_DIR || "./reports",
    },
  };
}

export function validateConfig(config: PipelineConfig): void {
  if (!config.llm.apiKey) {
    throw new Error(
      "API key is required. Set OPENAI_API_KEY in .env file or pass --api-key flag",
    );
  }

  if (config.output.formats.length === 0) {
    throw new Error("At least one output format must be specified");
  }

  const enabledAgents = Object.values(config.agents).filter(
    (a) => a.enabled,
  ).length;
  if (enabledAgents === 0) {
    throw new Error("At least one agent must be enabled");
  }
}
