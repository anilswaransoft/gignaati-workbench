@echo off
echo.
echo 🔧 Applying Gignaati Workbench Fixes...
echo.

REM Create backup directory
echo 📦 Creating backup...
if not exist backup mkdir backup
copy src\main\ollama-manager.js backup\ >nul 2>&1
copy src\main\n8n-manager.js backup\ >nul 2>&1
copy electron-main.js backup\ >nul 2>&1
copy preload.js backup\ >nul 2>&1
echo ✅ Backup created in .\backup\
echo.

REM Apply fixes
echo 🚀 Applying fixes...
copy src\main\ollama-manager-fixed.js src\main\ollama-manager.js >nul
copy src\main\n8n-manager-fixed.js src\main\n8n-manager.js >nul
copy electron-main-fixed.js electron-main.js >nul
copy preload-fixed.js preload.js >nul
echo ✅ All fixes applied!
echo.

echo 📝 Summary of changes:
echo   - Ollama timeout: 30s → 90s
echo   - N8N timeout: 15s → 60s
echo   - CPU usage: Capped at 50%% of cores
echo   - GPU offloading: Enabled
echo   - Loading screen: Added
echo   - Ollama-N8N integration: Configured
echo.

echo 🎯 Next steps:
echo   1. Run: npm start
echo   2. Wait for loading screen
echo   3. Test Ollama and N8N startup
echo.

echo ✨ Done! Your app is ready to run!
echo.
pause
