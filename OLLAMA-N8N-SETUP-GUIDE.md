# Ollama + N8N Integration Setup Guide

## The Issue

N8N requires **credentials** to connect to Ollama. Even though Ollama is running locally, N8N needs explicit configuration.

## Why Automatic Injection is Difficult

1. N8N generates its own encryption key on first launch
2. We can't predict or access this key before N8N starts
3. Manually injecting encrypted credentials causes "encryption key mismatch" errors

## Solution Options

### Option 1: Manual Setup (RECOMMENDED - Always Works)

**Steps**:
1. Open N8N (click "Make AI Agent")
2. Create a new workflow
3. Add an "Ollama Chat Model" node
4. Click "Credential to connect with" → "Create New Credential"
5. Enter:
   - **Name**: Local Ollama
   - **Base URL**: `http://localhost:11434`
   - **API Key**: (leave empty)
6. Click "Save"
7. Now select your models from the dropdown!

**This takes 30 seconds and works 100% of the time.**

---

### Option 2: Use N8N's API to Create Credentials (Programmatic)

Instead of database injection, use N8N's REST API after it starts:

```javascript
// After N8N is running
const response = await fetch('http://localhost:5678/rest/credentials', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Need authentication token
  },
  body: JSON.stringify({
    name: 'Local Ollama',
    type: 'ollamaApi',
    data: {
      baseUrl: 'http://localhost:11434'
    }
  })
});
```

**Problem**: Requires authentication, which means user must be logged in first.

---

### Option 3: Pre-configure N8N with Environment Variable

Set a fixed encryption key BEFORE N8N first starts:

```javascript
// In n8n-manager.js, add to env:
N8N_ENCRYPTION_KEY: 'your-fixed-32-byte-hex-key-here-64-characters-long'
```

Then we can encrypt credentials using this known key.

**Problem**: If user already has N8N data with a different key, it breaks.

---

### Option 4: Show Setup Wizard on First Launch

When user first opens N8N:
1. Detect if Ollama credentials exist
2. If not, show a friendly modal:
   - "Let's connect your AI Brain to N8N!"
   - Auto-fill the form with `http://localhost:11434`
   - User just clicks "Save"

**This is the best UX approach!**

---

## Current Status

- ✅ `OLLAMA_HOST` environment variable is set correctly
- ✅ Ollama is accessible at `http://localhost:11434`
- ❌ Automatic credential injection fails due to encryption key mismatch
- ✅ Manual setup works perfectly

## Recommended Approach

**Implement Option 4**: Setup wizard that guides users through credential creation on first launch.

This provides:
- ✅ Professional UX
- ✅ No encryption issues
- ✅ Works 100% of the time
- ✅ User understands what's happening
- ✅ Can be skipped if user prefers manual setup

## Implementation

Create a modal that appears when:
1. User clicks "Make AI Agent" for the first time
2. N8N loads but no Ollama credentials exist

The modal shows:
```
🤖 Connect Your AI Brain

To use local AI models in N8N, we need to connect to Ollama.

Base URL: http://localhost:11434 [auto-filled]

[Skip for now]  [Connect Automatically]
```

When user clicks "Connect Automatically":
1. Open N8N credential creation page with pre-filled data
2. User clicks "Save"
3. Done!

This is honest, transparent, and works perfectly with N8N's security model.

