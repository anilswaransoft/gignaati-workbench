(async function () {
    const OLLAMA_API = "http://localhost:11434";
    const DEFAULT_MODEL = "llama2";
    const MAX_MEMORY = 8;
    const SYSTEM_PROMPT = `System Role:
You are the Gignaati Workbench Assistant, a built-in chatbot that helps users navigate the UI of the Workbench app.
You can remember our recent conversation (last few messages) to provide contextual help.
You have no access to backend code or system state — only what the user tells you in chat.
Your job is to understand which screen they are on and guide them step-by-step to complete tasks, using UI instructions only.

Core Behavior Rules

UI Guidance Only:
You can explain visible buttons, tabs, menus, fields, or cards.
You cannot give or assume code, commands, or API solutions.

Conversational Memory:
You can remember details from our recent conversation to provide better help.
If the user mentions their name or asks about something discussed earlier, you can reference it naturally.
You infer the current screen based on keywords in the user's message or previous context.

Response Style:
Response Formatting Rules
Use plain text only.
No markdown symbols (**, #, *, etc.)
No emojis.
No hyperlinks — write "Click the Terms & Conditions link" instead of a real link.
Use numbered or bullet steps for clarity.
Short, clear, step-by-step.
Use actual UI terms from the screen (like "Configure", "Build AI Agents", "Get Started").
Friendly tone, light emojis for clarity (🖱️, ⚙️, 🚀).

Screen Logic & Guidance Patterns
1️⃣ Email Entry Screen
If user mentions "email", "get started", or "login":
🖱️ Enter your email in the "Enter Your Email" box →
✅ Check "I agree to the Terms & Conditions" →
🚀 Click Get Started to continue to your dashboard.

2️⃣ Build Screen (Ollama, n8n, Node.js, Models)
If user mentions "build", "install", "ollama", "n8n", or "model":
⚙️ You're on the Build screen!
Check your System Configuration section (CPU, RAM, GPU).
Pick a model card that matches your setup (e.g. Phi-3 Mini or TinyLlama).
Click Configure under the card to start the model installation.
When the installation completes, click Build AI Agents on the top-right to proceed.

3️⃣ Agent Platform (Earn Tab or AI Marketplace)
If user mentions "agent", "template", "earn", or "marketplace":
💡 You're in the Agent Builder!
Choose a template like "Language Tutor Assistant" or "Blog Writer Assistant".
Click Preview to see details or Copy to clone it.
To make your own, select Build from Scratch and follow on-screen prompts.
Once built, test and deploy directly inside this workspace.

4️⃣ Learn Tab (Tutorials & Courses)
If user mentions "learn", "video", "training", or "tutorial":
🎓 You're in the Learn section — here you can explore video guides on how to use Workbench.
Click on a course card to start watching, or use the Search bar to find specific lessons.

Tone & Personality
Tone: Helpful, calm, and non-technical.
Goal: Always keep the user moving forward visually, never stuck.
Avoid: Terms like "backend", "API", "error logs", or anything outside the app's visible UI.`;

    let state = {
        availableModels: [],
        selectedModel: DEFAULT_MODEL,
        conversationHistory: [],
        lastBotResponse: ""
    };

    const msgBox = document.getElementById("ollama-messages");
    const sendBtn = document.getElementById("ollama-send-btn");
    const input = document.getElementById("ollama-input");
    const modelSelect = document.getElementById("ollama-model-select");
    const ttsBtn = document.getElementById("tts-btn");
    const micBtn = document.getElementById("mic-btn");
    const quickActions = document.getElementById("quick-actions");

    // Add Message
    function addMessage(text, type = "bot") {
        const msg = document.createElement("div");
        msg.className = `gn-ollama-message gn-${type}`;
        msg.textContent = text;
        msgBox.appendChild(msg);
        msgBox.scrollTop = msgBox.scrollHeight;
        if (type === "bot") state.lastBotResponse = text;

        // Hide header and quick actions after first user message
        if (type === "user") {
            const chatContainer = document.getElementById("chatbot-container");
            const headerContent = document.getElementById("header-content");

            chatContainer.classList.add("gn-chat-active");
            headerContent.classList.add("gn-hidden");

            if (quickActions) {
                quickActions.classList.add('gn-hidden');
            }
        }
    }

    function addSystemMessage(text) {
        const msg = document.createElement("div");
        msg.className = "gn-ollama-message gn-system";
        msg.textContent = text;
        msgBox.appendChild(msg);
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    function showTyping() {
        const typingDiv = document.createElement("div");
        typingDiv.className = "gn-ollama-message gn-bot";
        typingDiv.id = "ollama-typing-indicator";
        typingDiv.innerHTML = '<div class="gn-ollama-typing"><span></span><span></span><span></span></div>';
        msgBox.appendChild(typingDiv);
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    function removeTyping() {
        const typing = document.getElementById("ollama-typing-indicator");
        if (typing) typing.remove();
    }

    function buildContext(newMsg) {
        let context = SYSTEM_PROMPT + "\n\n";
        const recent = state.conversationHistory.slice(-MAX_MEMORY * 2);
        for (const m of recent) {
            context += `${m.role === "user" ? "User" : "Assistant"}: ${m.content}\n`;
        }
        context += `User: ${newMsg}\nAssistant:`;
        return context;
    }

    async function fetchModels() {
        try {
            const res = await fetch(`${OLLAMA_API}/api/tags`);
            const data = await res.json();
            if (data.models?.length) {
                state.availableModels = data.models.map((m) => m.name);
                modelSelect.innerHTML = state.availableModels
                    .map((m) => `<option value="${m}">${m}</option>`)
                    .join("");
                state.selectedModel = state.availableModels[0];
                addSystemMessage(`Using model: ${state.selectedModel}`);
            } else addSystemMessage("No models found.");
        } catch {
            addSystemMessage("⚠️ Could not connect to Ollama.");
        }
    }

    async function sendMessage() {
        const msg = input.value.trim();
        if (!msg) return;
        addMessage(msg, "user");
        input.value = "";
        const prompt = buildContext(msg);
        state.conversationHistory.push({ role: "user", content: msg });

        showTyping();
        try {
            const res = await fetch(`${OLLAMA_API}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: state.selectedModel,
                    prompt,
                    stream: false,
                }),
            });
            const data = await res.json();
            removeTyping();
            if (data.response) {
                addMessage(data.response.trim(), "bot");
                state.conversationHistory.push({ role: "assistant", content: data.response.trim() });

            } else addMessage("No response received.", "bot");
        } catch {
            removeTyping();
            addMessage("Error: Could not reach Ollama.", "bot");
        }
    }

    // Text to Speech
    function speakText(text) {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 1;
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
    }

    // Speech to Text (Voice Input)
    let recognition;
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => micBtn.classList.add("gn-listening");
        recognition.onend = () => micBtn.classList.remove("gn-listening");
        recognition.onerror = () => micBtn.classList.remove("gn-listening");

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
        };
    } else {
        micBtn.disabled = true;
        micBtn.title = "Voice input not supported in this browser.";
    }

    micBtn.addEventListener("click", () => {
        if (recognition) recognition.start();
    });

    // Quick prompt function
    window.quickPrompt = function (prompt) {
        input.value = prompt;
        sendMessage();
    };

    // Scroll to chat function
    window.scrollToChat = function () {
        input.focus();
    };

    // Events
    ttsBtn.addEventListener("click", () => speakText(state.lastBotResponse));
    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
    modelSelect.addEventListener("change", (e) => {
        state.selectedModel = e.target.value;
        addSystemMessage(`Switched to model: ${state.selectedModel}`);
    });

    fetchModels();
})();


//   <!-- External link handler: ensure http(s)/mailto links open in the user's default browser. -->

(function () {
    function isExternal(href) {
        return /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
    }

    // Try to open using Electron's shell if available, otherwise fallback to window.open
    async function openExternally(href) {
        // 1) Try direct require (works when nodeIntegration is enabled)
        try {
            if (typeof window.require === 'function') {
                const electron = window.require('electron');
                if (electron && electron.shell && typeof electron.shell.openExternal === 'function') {
                    electron.shell.openExternal(href);
                    return;
                }
            }
        } catch (e) {
            // ignore
        }

        // 2) Try contextBridge-provided API (preload). Many apps expose a method like openExternal
        try {
            if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
                window.electronAPI.openExternal(href);
                return;
            }
        } catch (e) {
            // ignore
        }

        // 3) Fallback to window.open in a new tab/window
        try {
            window.open(href, '_blank', 'noopener');
        } catch (e) {
            // last resort: change location
            window.location.href = href;
        }
    }

    document.addEventListener('click', function (ev) {
        // Delegate clicks on anchor tags
        let el = ev.target;
        while (el && el !== document.body) {
            if (el.tagName && el.tagName.toLowerCase() === 'a' && el.href) {
                const href = el.getAttribute('href');
                if (href && isExternal(href)) {
                    ev.preventDefault();
                    openExternally(href);
                    return;
                }
                // For non-external links, allow normal navigation
                return;
            }
            el = el.parentNode;
        }
    }, { capture: true });

    // Set target and rel for safety on existing links
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (!href) return;
            if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            }
        });
    });
})();