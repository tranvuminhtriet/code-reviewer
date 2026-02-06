# @tvmt/commit-reporter

AI-powered code review automation with Google Gemini & OpenAI. Analyze commits and generate comprehensive review reports.

## Features

- 🤖 **Three Specialized AI Agents**:
  - **Code Review Agent**: Analyzes code quality, best practices, and potential bugs
  - **Security Agent**: Scans for security vulnerabilities (OWASP Top 10)
  - **Performance Agent**: Detects performance anti-patterns with AST analysis

- 📊 **Comprehensive Reports**: Generate both Markdown and HTML reports
- 🔄 **Sequential Pipeline**: Agents run in sequence, each building on previous findings
- 🎯 **TypeScript/JavaScript Focus**: Filters and analyzes only TS/JS files
- ⚙️ **Flexible Configuration**: Environment variables and CLI options
- 🔌 **Multiple LLM Providers**: Google Gemini & OpenAI support

## 🚀 Quick Start

### Installation

```bash
# Global installation (recommended)
npm install -g @tvmt/commit-reporter

# Or use with npx (no installation needed)
npx @tvmt/commit-reporter review
```

### Setup

1. Create `.env` file in your project:

```bash
# Choose your LLM provider
LLM_PROVIDER=google-genai

# Add your API key
GEMINI_API_KEY=your-api-key-here
# Or for OpenAI
# OPENAI_API_KEY=sk-...
```

2. Run review:

```bash
commit-reporter review
```

## Installation from Source

```bash
# Clone the repository
git clone https://github.com/tranvuminhtriet/code-reviewer.git
cd code-reviewer

# Install dependencies
npm install

# Build
npm run build

# Link globally
npm link
```

## Quick Start

### Review a Git Commit

```bash
# Review the latest commit
npm run review

# Review a specific commit
npm run review -- --commit abc123

# Review HEAD~1
npm run review -- --commit HEAD~1
```

### Review from a Diff File

```bash
# Use the example diff
npm run review -- --file examples/sample-diff.txt

# Use your own diff file
npm run review -- --file path/to/your.diff
```

## Configuration

### Environment Variables (.env)

```bash
# LLM Provider
LLM_PROVIDER=openai
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Output
OUTPUT_DIR=./reports
OUTPUT_FORMATS=markdown,html

# Agents (set to false to disable)
ENABLE_CODE_REVIEW=true
ENABLE_SECURITY=true
ENABLE_PERFORMANCE=true
```

### CLI Options

```bash
code-review review [options]

Options:
  -c, --commit <hash>      Git commit hash (default: "HEAD")
  -f, --file <path>        Diff file path
  --api-key <key>          OpenAI API key (overrides env)
  --model <name>           Model name
  --output <dir>           Output directory
  --format <formats>       Output formats: markdown,html
  --no-code-review         Disable code review agent
  --no-security            Disable security agent
  --no-performance         Disable performance agent
  -h, --help               Display help
```

## Examples

### Basic Usage

```bash
# Review latest commit with default settings
npm run review

# Output:
# ✓ Parsed 2 file(s): 2 files changed, 30 insertions(+), 5 deletions(-)
# 🤖 Starting AI code review...
# Running Code Review Agent...
# ✓ Code Review: 5 findings
# Running Security Agent...
# ✓ Security: 3 findings
# Running Performance Agent...
# ✓ Performance: 2 findings
# ✅ Review complete!
```

### Custom Configuration

```bash
# Only run security and performance agents
npm run review -- --no-code-review

# Use a different model
npm run review -- --model gpt-4

# Output only markdown
npm run review -- --format markdown

# Custom output directory
npm run review -- --output ./my-reports
```

### Review Specific Files

```bash
# Create a diff of specific files
git diff HEAD~1 -- src/api/*.ts > my-changes.diff

# Review the diff
npm run review -- --file my-changes.diff
```

## Report Output

Reports are generated in the specified output directory (default: `./reports`):

```
reports/
├── code-review-2024-02-05T10-30-00.md
└── code-review-2024-02-05T10-30-00.html
```

### Report Structure

1. **Summary**: Total findings by severity and agent
2. **Token Usage**: LLM token consumption
3. **Code Review Findings**: Code quality issues
4. **Security Findings**: Security vulnerabilities
5. **Performance Findings**: Performance issues

Each finding includes:

- Severity (Critical, High, Medium, Low)
- Category
- Description
- File and line number
- Suggestion for fix

## Architecture

```
┌─────────────────┐
│  Git Diff       │
│  Parser         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Code Review    │
│  Agent          │
└────────┬────────┘
         │ (findings)
         ▼
┌─────────────────┐
│  Security       │
│  Agent          │
│  + ESLint       │
└────────┬────────┘
         │ (findings)
         ▼
┌─────────────────┐
│  Performance    │
│  Agent          │
│  + AST Analysis │
└────────┬────────┘
         │ (findings)
         ▼
┌─────────────────┐
│  Report         │
│  Generator      │
│  (MD + HTML)    │
└─────────────────┘
```

## Development

### Build

```bash
npm run build
```

### Run in Development Mode

```bash
npm run dev review -- --file examples/sample-diff.txt
```

### Project Structure

```
src/
├── agents/           # AI agents
│   ├── base-agent.ts
│   ├── code-review-agent.ts
│   ├── security-agent.ts
│   └── performance-agent.ts
├── llm/              # LLM provider abstraction
│   ├── types.ts
│   ├── provider.ts
│   └── openai-provider.ts
├── parsers/          # Git diff parser
│   ├── types.ts
│   └── git-diff-parser.ts
├── reporters/        # Report generators
│   ├── types.ts
│   ├── base-reporter.ts
│   ├── markdown-reporter.ts
│   └── html-reporter.ts
├── pipeline/         # Orchestration
│   ├── types.ts
│   └── executor.ts
├── config/           # Configuration
│   └── default.ts
└── cli.ts            # CLI entry point
```

## Future Enhancements

### Phase 2: Additional LLM Providers

```bash
# Anthropic Claude
npm run review -- --provider anthropic --api-key sk-ant-...

# Local Ollama
npm run review -- --provider ollama --model codellama
```

### Phase 3: CI/CD Integration

```yaml
# .github/workflows/code-review.yml
name: AI Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run review -- --commit ${{ github.event.pull_request.head.sha }}
      - uses: actions/upload-artifact@v3
        with:
          name: code-review-report
          path: reports/
```

### Phase 4: Migration to LangGraph

For more complex workflows, the architecture can be migrated to LangGraph:

```typescript
import { StateGraph } from '@langchain/langgraph';

const workflow = new StateGraph({...});
workflow
  .addNode('codeReview', codeReviewAgent)
  .addNode('security', securityAgent)
  .addNode('performance', performanceAgent)
  .addEdge('codeReview', 'security')
  .addEdge('codeReview', 'performance');
```

## Troubleshooting

### "API key is required" Error

Make sure you have set `OPENAI_API_KEY` in your `.env` file or pass it via CLI:

```bash
npm run review -- --api-key sk-...
```

### "No TypeScript/JavaScript files found"

The tool only analyzes `.ts`, `.tsx`, `.js`, and `.jsx` files. Check that your diff contains these file types.

### ESLint Errors

If you encounter ESLint parsing errors, the security agent will skip those files and continue with others.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
