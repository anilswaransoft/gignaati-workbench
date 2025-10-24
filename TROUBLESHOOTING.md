# Troubleshooting Guide - N8N Startup Issues

## ❌ Error: "N8N process exited before becoming ready (code 1)"

This error means N8N started but crashed immediately. Here's how to fix it:

---

## 🔍 Step 1: Run Diagnostics

Open terminal in the project folder and run:

```cmd
node check-n8n.js
```

This will tell you exactly what's wrong.

---

## 🛠️ Step 2: Common Fixes

### Fix 1: Install N8N Dependencies

The most common cause is missing N8N installation. Run:

```cmd
npm install
```

Or if that doesn't work:

```cmd
install-n8n.bat
```

Or manually:

```cmd
npm install -g n8n
```

---

### Fix 2: Check Port 5678

N8N needs port 5678. Check if it's in use:

**Windows:**
```cmd
netstat -ano | findstr :5678
```

If something is using it:
1. Close any running N8N instances
2. Or kill the process: `taskkill /PID <PID> /F`

---

### Fix 3: Clear N8N Data (if corrupted)

Sometimes the N8N database gets corrupted. Delete it:

**Windows:**
```cmd
del %APPDATA%\Gignaati Workbench\n8n-data\database.sqlite
```

Then restart the app.

---

### Fix 4: Check Node.js Version

N8N requires Node.js 18 or higher. Check your version:

```cmd
node --version
```

If it's below v18, update Node.js from: https://nodejs.org/

---

### Fix 5: Run N8N Manually (Debug)

Try running N8N directly to see the error:

```cmd
npx n8n
```

Or if installed globally:

```cmd
n8n
```

This will show you the exact error message.

---

## 📋 Step 3: Check the Logs

N8N creates detailed logs. Check them:

**Windows:**
```
%APPDATA%\Gignaati Workbench\logs\n8n-boot.log
```

**macOS:**
```
~/Library/Application Support/Gignaati Workbench/logs/n8n-boot.log
```

**Linux:**
```
~/.config/Gignaati Workbench/logs/n8n-boot.log
```

---

## ✅ Step 4: Verify Installation

After fixing, verify everything works:

1. **Check N8N:**
   ```cmd
   n8n --version
   ```
   Should show: `1.116.2` or similar

2. **Check port:**
   ```cmd
   netstat -ano | findstr :5678
   ```
   Should be empty (port available)

3. **Run the app:**
   ```cmd
   npm start
   ```

---

## 🚀 Quick Fix (Most Common)

90% of the time, this fixes it:

```cmd
npm install
npm start
```

If that doesn't work, run:

```cmd
node check-n8n.js
```

And follow the recommendations.

---

## 💡 Still Not Working?

If none of the above works, try this **nuclear option**:

1. **Delete node_modules:**
   ```cmd
   rmdir /s /q node_modules
   ```

2. **Delete package-lock.json:**
   ```cmd
   del package-lock.json
   ```

3. **Reinstall everything:**
   ```cmd
   npm install
   ```

4. **Run the app:**
   ```cmd
   npm start
   ```

---

## 📞 Need More Help?

Check the console output when you run `npm start`. It will show:

```
========== N8N STARTUP FAILURE ==========
Exit code: 1
Launcher used: npx n8n
--- STDOUT ---
(the output here)
--- STDERR ---
(the error here)
========================================
```

Send this output for more specific help!

---

## 🎯 Expected Behavior

When working correctly, you should see:

```
Installing Ollama...
✅ Ollama installed successfully
Configuring GPU acceleration...
✅ Ollama started with CPU/GPU
Setting up N8N workspace...
✅ N8N configured
Starting N8N server...
✅ N8N started successfully!
```

Then the loading screen will complete and show the dashboard.

