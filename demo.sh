#!/bin/bash

# Code Review Automation - Quick Start Demo

echo "🚀 Code Review Automation - Quick Start"
echo "========================================"
echo ""

# Check if .env exists and has API key
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and add your OpenAI API key"
    exit 1
fi

# Check if API key is set
if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "⚠️  OpenAI API key not found in .env file"
    echo ""
    echo "Please add your API key to .env:"
    echo "  OPENAI_API_KEY=sk-your-key-here"
    echo ""
    echo "Or run with --api-key flag:"
    echo "  npm run review -- --file examples/sample-diff.txt --api-key sk-..."
    exit 1
fi

echo "✓ Configuration found"
echo ""

# Run the review on example diff
echo "📝 Reviewing example diff file..."
echo ""

npm run review -- --file examples/sample-diff.txt

echo ""
echo "✅ Demo complete!"
echo ""
echo "Check the reports/ directory for generated reports."
echo ""
echo "Next steps:"
echo "  1. Review a real commit: npm run review -- --commit HEAD"
echo "  2. Customize agents: npm run review -- --no-performance"
echo "  3. Change output: npm run review -- --format markdown --output ./my-reports"
