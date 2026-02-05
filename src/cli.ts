#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { GitDiffParser } from "./parsers/git-diff-parser.js";
import { PipelineExecutor } from "./pipeline/executor.js";
import { getDefaultConfig, validateConfig } from "./config/default.js";
import type { PipelineConfig } from "./pipeline/types.js";

const program = new Command();

program
  .name("code-review")
  .description("Automated code review with AI agents")
  .version("1.0.0");

program
  .command("review")
  .description("Review code changes")
  .option("-c, --commit <hash>", "Git commit hash to review", "HEAD")
  .option("-f, --file <path>", "Diff file path (alternative to commit)")
  .option(
    "--provider <type>",
    "LLM provider: openai or google-genai (default: openai)",
  )
  .option("--api-key <key>", "API key (overrides env)")
  .option("--model <name>", "Model name")
  .option("--output <dir>", "Output directory (default: ./reports)")
  .option("--format <formats>", "Output formats: markdown,html (default: both)")
  .option("--no-code-review", "Disable code review agent")
  .option("--no-security", "Disable security agent")
  .option("--no-performance", "Disable performance agent")
  .action(async (options) => {
    const spinner = ora();

    try {
      // Build configuration
      const config = getDefaultConfig();

      // Apply CLI overrides
      if (options.provider) {
        config.llm.provider = options.provider;
      }
      if (options.apiKey) {
        config.llm.apiKey = options.apiKey;
      }
      if (options.model) {
        config.llm.model = options.model;
      }
      if (options.output) {
        config.output.directory = options.output;
      }
      if (options.format) {
        config.output.formats = options.format.split(",") as any;
      }
      if (options.codeReview === false) {
        config.agents.codeReview.enabled = false;
      }
      if (options.security === false) {
        config.agents.security.enabled = false;
      }
      if (options.performance === false) {
        config.agents.performance.enabled = false;
      }

      // Validate configuration
      validateConfig(config);

      // Parse diff
      spinner.start("Parsing code changes...");
      const parser = new GitDiffParser();
      const diff = options.file
        ? await parser.parseDiffFile(options.file)
        : await parser.parseDiff(options.commit);

      if (diff.files.length === 0) {
        spinner.warn("No TypeScript/JavaScript files found in diff");
        return;
      }

      spinner.succeed(`Parsed ${diff.files.length} file(s): ${diff.summary}`);

      // Execute pipeline
      console.log(chalk.cyan("\n🤖 Starting AI code review...\n"));

      const executor = new PipelineExecutor();
      const result = await executor.execute(diff, config);

      if (!result.success) {
        spinner.fail("Review failed");
        console.error(chalk.red(`\nError: ${result.error}`));
        process.exit(1);
      }

      // Display summary
      console.log(chalk.green("\n✅ Review complete!\n"));

      const { summary } = result.report;
      console.log(chalk.bold("Summary:"));
      console.log(`  Total findings: ${summary.totalFindings}`);
      console.log(`  🔴 Critical: ${summary.critical}`);
      console.log(`  🟠 High: ${summary.high}`);
      console.log(`  🟡 Medium: ${summary.medium}`);
      console.log(`  🟢 Low: ${summary.low}`);

      console.log(chalk.bold("\nBy Agent:"));
      console.log(`  Code Review: ${summary.byAgent.codeReview}`);
      console.log(`  Security: ${summary.byAgent.security}`);
      console.log(`  Performance: ${summary.byAgent.performance}`);

      if (result.report.tokenUsage) {
        console.log(chalk.bold("\nToken Usage:"));
        console.log(
          `  Total: ${result.report.tokenUsage.total.toLocaleString()}`,
        );
      }

      console.log(chalk.bold("\nReports:"));
      for (const output of result.outputs) {
        console.log(
          `  ${output.format.toUpperCase()}: ${chalk.cyan(output.path)}`,
        );
      }

      console.log(
        chalk.gray(
          `\nExecution time: ${(result.report.executionTime / 1000).toFixed(2)}s`,
        ),
      );
    } catch (error) {
      spinner.fail("Review failed");

      if (error instanceof Error) {
        console.error(chalk.red(`\nError: ${error.message}`));

        if (error.message.includes("API key")) {
          console.log(
            chalk.yellow(
              "\nTip: Set your API key in .env file or use --api-key flag",
            ),
          );
          console.log(
            chalk.gray("Example: code-review review --api-key sk-..."),
          );
        }
      } else {
        console.error(chalk.red("\nUnknown error occurred"));
      }

      process.exit(1);
    }
  });

program.parse();
