#!/bin/bash

echo "🔧 Applying Gignaati Workbench Fixes..."
echo ""

# Create backup directory
echo "📦 Creating backup..."
mkdir -p backup
cp src/main/ollama-manager.js backup/ 2>/dev/null || true
cp src/main/n8n-manager.js backup/ 2>/dev/null || true
cp electron-main.js backup/ 2>/dev/null || true
cp preload.js backup/ 2>/dev/null || true
echo "✅ Backup created in ./backup/"
echo ""

# Apply fixes
echo "🚀 Applying fixes..."
cp src/main/ollama-manager-fixed.js src/main/ollama-manager.js
cp src/main/n8n-manager-fixed.js src/main/n8n-manager.js
cp electron-main-fixed.js electron-main.js
cp preload-fixed.js preload.js
echo "✅ All fixes applied!"
echo ""

echo "📝 Summary of changes:"
echo "  - Ollama timeout: 30s → 90s"
echo "  - N8N timeout: 15s → 60s"
echo "  - CPU usage: Capped at 50% of cores"
echo "  - GPU offloading: Enabled"
echo "  - Loading screen: Added"
echo "  - Ollama-N8N integration: Configured"
echo ""

echo "🎯 Next steps:"
echo "  1. Run: npm start"
echo "  2. Wait for loading screen"
echo "  3. Test Ollama and N8N startup"
echo ""

echo "✨ Done! Your app is ready to run!"
