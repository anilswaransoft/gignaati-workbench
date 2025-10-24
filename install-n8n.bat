@echo off
echo.
echo ========================================
echo    Installing N8N for Gignaati Workbench
echo ========================================
echo.

echo Checking if N8N is already installed...
call n8n --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ N8N is already installed globally!
    echo.
    n8n --version
    echo.
    echo You can now run the application with: npm start
    pause
    exit /b 0
)

echo N8N not found. Installing locally...
echo.
echo This may take a few minutes...
echo.

npm install n8n

if %errorlevel% == 0 (
    echo.
    echo ✅ N8N installed successfully!
    echo.
    echo You can now run the application with: npm start
) else (
    echo.
    echo ❌ Installation failed!
    echo.
    echo Please try manually:
    echo   npm install -g n8n
    echo.
    echo Or check your internet connection.
)

echo.
pause

