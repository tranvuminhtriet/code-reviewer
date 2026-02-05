# Code Review Automation - Quick Reference

## 🚀 Quick Start

```bash
# 1. Add your OpenAI API key to .env
echo "OPENAI_API_KEY=sk-your-key-here" >> .env

# 2. Run demo
./demo.sh

# 3. Review real code
npm run review
```

## 📝 Common Commands

### Review Code

```bash
# Latest commit
npm run review

# Specific commit
npm run review -- --commit abc123

# From diff file
npm run review -- --file path/to/diff.txt

# Previous commit
npm run review -- --commit HEAD~1
```

### Customize Agents

```bash
# Only security and performance
npm run review -- --no-code-review

# Only code review
npm run review -- --no-security --no-performance

# All agents (default)
npm run review
```

### Output Options

```bash
# Only markdown
npm run review -- --format markdown

# Only HTML
npm run review -- --format html

# Both (default)
npm run review -- --format markdown,html

# Custom directory
npm run review -- --output ./my-reports
```

### Model Selection

```bash
# Use GPT-4
npm run review -- --model gpt-4

# Use GPT-3.5 (faster, cheaper)
npm run review -- --model gpt-3.5-turbo

# Default: gpt-4-turbo-preview
```

## 🔧 Configuration Files

### .env

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OUTPUT_DIR=./reports
OUTPUT_FORMATS=markdown,html
ENABLE_CODE_REVIEW=true
ENABLE_SECURITY=true
ENABLE_PERFORMANCE=true
```

## 📊 Understanding Reports

### Severity Levels

- 🔴 **Critical**: Must fix immediately (security vulnerabilities, critical bugs)
- 🟠 **High**: Should fix soon (important issues, performance problems)
- 🟡 **Medium**: Should fix eventually (code quality, best practices)
- 🟢 **Low**: Nice to have (minor improvements, suggestions)

### Finding Types

- ❌ **Error**: Must be fixed
- ⚠️ **Warning**: Should be reviewed
- ℹ️ **Info**: Informational, optional

## 🎯 Use Cases

### Before Committing

```bash
# Review your changes before commit
git diff > my-changes.diff
npm run review -- --file my-changes.diff
```

### Code Review

```bash
# Review a PR's changes
git diff main...feature-branch > pr-changes.diff
npm run review -- --file pr-changes.diff
```

### Audit Existing Code

```bash
# Review last 5 commits
for i in {1..5}; do
  npm run review -- --commit HEAD~$i
done
```

## 🐛 Troubleshooting

### "API key is required"

```bash
# Add to .env
echo "OPENAI_API_KEY=sk-..." >> .env

# Or use CLI flag
npm run review -- --api-key sk-...
```

### "No TypeScript/JavaScript files found"

The tool only analyzes `.ts`, `.tsx`, `.js`, `.jsx` files. Check your diff.

### ESLint Errors

Some files may fail ESLint parsing. The tool will skip them and continue.

### Rate Limits

If you hit OpenAI rate limits:

- Use a smaller model: `--model gpt-3.5-turbo`
- Disable some agents: `--no-performance`
- Review smaller diffs

## 💡 Tips

1. **Start small**: Test with example diff first
2. **Iterate**: Disable agents you don't need
3. **Save costs**: Use GPT-3.5 for quick reviews
4. **Batch reviews**: Review multiple commits at once
5. **Read suggestions**: Each finding includes actionable advice

## 📁 File Locations

```
code-reviewer/
├── .env                    # Your API key here
├── demo.sh                 # Quick start script
├── examples/
│   └── sample-diff.txt     # Example for testing
├── reports/                # Generated reports
└── src/                    # Source code
```

## 🔗 Useful Links

- [README.md](file:///Users/triettran/Documents/self-learning/code-reviewer/README.md) - Full documentation
- [Walkthrough](file:///Users/triettran/.gemini/antigravity/brain/fc349882-947b-4210-9c00-c19526a5a128/walkthrough.md) - Implementation details
- [Example Diff](file:///Users/triettran/Documents/self-learning/code-reviewer/examples/sample-diff.txt) - Sample input

## ⚡ Performance Tips

- **Smaller diffs = faster**: Review incremental changes
- **Disable unused agents**: Skip agents you don't need
- **Use GPT-3.5**: Faster and cheaper for quick reviews
- **Batch similar files**: Group related changes

## 🎓 Learning Resources

### Understanding Findings

Each report section explains:

- **What**: The issue found
- **Where**: File and line number
- **Why**: Why it's a problem
- **How**: Suggestion to fix

### Improving Code Quality

Use findings to learn:

- Security best practices (OWASP)
- Performance patterns
- TypeScript type safety
- Modern JavaScript features
