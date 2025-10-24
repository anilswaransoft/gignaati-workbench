# 📦 Setup Instructions - Gignaati Workbench

## ⚠️ Important: Add Ollama Installer

Before running the app, you need to add the Ollama installer file.

---

## 🔧 Step 1: Create Folder Structure

```cmd
cd gignaati-workbench
mkdir resources
mkdir resources\binaries
```

---

## 📥 Step 2: Download Ollama Installer

**Windows:**
1. Go to: https://ollama.com/download
2. Download **OllamaSetup.exe**
3. Place it in: `gignaati-workbench/resources/binaries/OllamaSetup.exe`

**macOS:**
1. Go to: https://ollama.com/download
2. Download **Ollama.dmg**
3. Place it in: `gignaati-workbench/resources/binaries/Ollama.dmg`

---

## ✅ Step 3: Verify File Location

Your folder structure should look like this:

```
gignaati-workbench/
├── resources/
│   └── binaries/
│       └── OllamaSetup.exe    ← Windows installer here
├── src/
├── index.html
├── electron-main.js
├── package.json
└── ...
```

---

## 🚀 Step 4: Install Dependencies

```cmd
npm install
```

---

## ▶️ Step 5: Run the App

```cmd
npm start
```

---

## 🎯 What Happens When You Click "Click to Launch"

1. **App checks** for OllamaSetup.exe in multiple locations:
   - `resources/binaries/OllamaSetup.exe` ✅ (recommended)
   - `OllamaSetup.exe` (root folder)
   - Other possible locations

2. **Installer opens** with UI visible

3. **You click "Install"** in the installer window

4. **App monitors** installation progress:
   - Checks every 2 seconds if Ollama is installed
   - Updates progress bar: 10% → 20% → 30% → ... → 100%
   - Shows status messages

5. **Installation completes** when Ollama is detected at:
   - Windows: `C:\Users\YourName\AppData\Local\Programs\Ollama\ollama.exe`
   - macOS: `/usr/local/bin/ollama`

---

## 🐛 Troubleshooting

### **Problem: "Installer not found" error**

**Solution:**
1. Check if `OllamaSetup.exe` is in `resources/binaries/` folder
2. Check console logs to see where it's searching
3. Make sure filename is exactly `OllamaSetup.exe` (case-sensitive)

**Console will show:**
```
Checking for installer at: C:\...\resources\binaries\OllamaSetup.exe
Checking for installer at: C:\...\OllamaSetup.exe
...
Found installer at: C:\...\resources\binaries\OllamaSetup.exe ✓
Launching installer from: C:\...\resources\binaries\OllamaSetup.exe
```

---

### **Problem: Stuck at 5-10% progress**

**Possible causes:**

1. **Installer didn't open**
   - Check Task Manager for "OllamaSetup.exe"
   - If not running, check console for errors

2. **You haven't clicked "Install" yet**
   - Look for the Ollama installer window
   - Click "Install" button
   - Progress will update after installation starts

3. **Installation is slow**
   - Normal! Can take 2-5 minutes
   - Progress bar will update every 2 seconds
   - Wait for "AI Brain installed successfully"

---

### **Problem: Progress stuck, but Ollama is installed**

**Check if Ollama is actually installed:**

```cmd
# Windows
dir "%LOCALAPPDATA%\Programs\Ollama\ollama.exe"

# macOS/Linux
ls -la /usr/local/bin/ollama
```

**If installed but app doesn't detect it:**
- Close the app
- Restart: `npm start`
- App should detect existing installation

---

## 📊 Expected Timeline

| Step | Time | Progress |
|------|------|----------|
| Installer opens | 2-5s | 5-10% |
| You click "Install" | User action | 10% |
| Downloading components | 30-60s | 10-40% |
| Installing files | 60-120s | 40-80% |
| Finalizing | 10-20s | 80-95% |
| Verification | 2-5s | 95-100% |
| **Total** | **2-5 minutes** | **100%** |

---

## 💡 Pro Tips

1. **Pre-download installer** before running app for faster setup

2. **Watch console logs** for detailed progress:
   ```
   Check 1: Ollama installed = false
   Check 2: Ollama installed = false
   ...
   Check 15: Ollama installed = true ✓
   Ollama installation detected!
   ```

3. **Don't close installer window** until progress reaches 100%

4. **Be patient** - installation can take 2-5 minutes depending on internet speed

---

## ✅ Success Indicators

You'll know it's working when you see:

1. **Console logs:**
   ```
   Found installer at: ...
   Launching installer from: ...
   Installer launched, waiting for user to click Install...
   Check 1: Ollama installed = false
   Check 2: Ollama installed = false
   ...
   Check 15: Ollama installed = true
   Ollama installation detected!
   ```

2. **Progress bar updates** from 10% → 100%

3. **Status messages change:**
   - "Please click Install in the installer window"
   - "Waiting for installation to start..."
   - "Installing AI Brain components..."
   - "Finalizing installation..."
   - "AI Brain installed successfully" ✓

4. **Dashboard appears** with system stats

---

## 🎉 After Installation

Once installed, you can:
- Download LLM models
- Build AI agents in N8N
- Use templates
- Create workflows

**Ollama will auto-start** on subsequent launches (no installer needed)!

---

## 📞 Still Having Issues?

Check the console logs and look for:
- Where it's searching for the installer
- If the installer launched
- Installation check results
- Any error messages

Share the console output for debugging help!

---

**Happy building!** 🚀

