const OllamaChatbot = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        ollamaApiUrl: 'http://localhost:11434',
        defaultModel: 'llama2',
        bubbleSize: '60px',
        chatWidth: '380px',
        chatHeight: '550px',
        animationDuration: '300ms',
        maxMemoryTurns: 8, // Maximum conversation turns to remember
        systemPrompt: `System Role:
You are the Gignaati Workbench Assistant, a built-in chatbot that helps users navigate the UI of the Workbench app.
You can remember our recent conversation (last few messages) to provide contextual help.
You have no access to backend code or system state — only what the user tells you in chat.
Your job is to understand which screen they are on and guide them step-by-step to complete tasks, using UI instructions only.

⚙️ Core Behavior Rules

UI Guidance Only:

You can explain visible buttons, tabs, menus, fields, or cards.

You cannot give or assume code, commands, or API solutions.

Conversational Memory:

You can remember details from our recent conversation to provide better help.

If the user mentions their name or asks about something discussed earlier, you can reference it naturally.

You infer the current screen based on keywords in the user's message or previous context.

"email", "get started" → Login screen

"build", "ollama", "model", "configure" → Build screen

"agent", "template", "earn" → Agent creation / Marketplace screen

"learn", "video" → Learning section

When unsure:

Politely ask: "Could you please tell me which screen you're currently on — Learn, Build, or Earn?"

Then give instructions relevant to that screen.

No Code or Terminal Help:

Never mention or suggest CLI commands, code, API setup, or local paths.

Focus only on visible UI actions (click, select, open, refresh).

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

🧭 Screen Logic & Guidance Patterns
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

🧩 Example Dialogues

User: "I entered my email but nothing happens."

Please check that you've ticked the checkbox for "Terms & Conditions" before pressing Get Started. If it's already ticked, try re-entering your email and click Get Started again.

User: "Which model should I pick for 8 cores and 16GB RAM?"

Your setup can handle mid-tier models smoothly — try Phi-3 Mini (3.8B) or Gemma2 (2B). Click Configure below the card to begin installation.

User: "How do I create my first agent?"

Go to the Earn tab, click Build from Scratch, or pick a ready template like Language Tutor Assistant. Then click Copy to launch it in your workspace.

User: "It says installation done — what next?"

Great 🎉 Click on the Build AI Agents button in the top-right. It'll take you to the agent creation platform where you can start using your installed models.

🧱 Tone & Personality

Tone: Helpful, calm, and non-technical.

Goal: Always keep the user moving forward visually, never stuck.

Avoid: Terms like "backend", "API", "error logs", or anything outside the app's visible UI.`
    };

    // State management
    let state = {
        isOpen: false,
        isMinimized: false,
        availableModels: [],
        selectedModel: null,
        conversationHistory: [],
        isLoading: false,
        abortController: null // For canceling requests
    };

    // Styles (injected as CSS)
    const styles = `
        .ollama-chatbot-container * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        .ollama-chatbot-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .ollama-chat-bubble {
            width: ${CONFIG.bubbleSize};
            height: ${CONFIG.bubbleSize};
            border-radius: 50%;
            background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all ${CONFIG.animationDuration} ease;
            position: relative;
            border: 2px solid #333;
        }

        .ollama-chat-bubble:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.7);
            border-color: #555;
        }

        .ollama-chat-bubble::before {
            content: '';
            width: 36px;
            height: 36px;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.38 0-2.68-.29-3.86-.81l-.28-.13-2.82.47.48-2.82-.14-.29A7.93 7.93 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><path d="M8 15h8c-.55 1.24-1.73 2-3 2h-2c-1.27 0-2.45-.76-3-2z"/></svg>');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
        }

        .ollama-popup-notification {
            position: fixed;
            bottom: 90px;
            right: 20px;
            background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
            color: white;
            padding: 12px 18px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            border: 2px solid #333;
            z-index: 999998;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease;
            pointer-events: none;
        }

        .ollama-popup-notification.show {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }

        .ollama-popup-notification::before {
            content: '💬';
            font-size: 20px;
        }

        .ollama-popup-close {
            background: transparent;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            margin-left: 8px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .ollama-popup-close:hover {
            opacity: 1;
        }

        .ollama-chat-window {
            position: absolute;
            bottom: 0;
            right: 0;
            width: ${CONFIG.chatWidth};
            height: ${CONFIG.chatHeight};
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            display: none;
            flex-direction: column;
            overflow: hidden;
            transform: scale(0.9);
            opacity: 0;
            transition: all ${CONFIG.animationDuration} ease;
            border: 2px solid #000;
        }

        .ollama-chat-window.open {
            display: flex;
            transform: scale(1);
            opacity: 1;
        }

        .ollama-chat-window.minimized {
            height: 60px;
        }

        .ollama-chat-header {
            background: #000000;
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            border-bottom: 2px solid #333;
        }

        .ollama-chat-title {
            font-weight: 600;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .ollama-chat-controls {
            display: flex;
            gap: 10px;
        }

        .ollama-chat-btn {
            background: #333;
            border: 1px solid #555;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s;
        }

        .ollama-chat-btn:hover {
            background: #555;
            border-color: #777;
        }

        .ollama-chat-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .ollama-model-selector {
            padding: 12px 15px;
            background: #f5f5f5;
            border-bottom: 2px solid #e0e0e0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .ollama-model-selector select {
            flex: 1;
            padding: 8px 12px;
            border: 2px solid #000;
            border-radius: 8px;
            font-size: 13px;
            background: white;
            cursor: pointer;
            outline: none;
            font-weight: 500;
        }

        .ollama-model-selector select:focus {
            border-color: #333;
        }

        .ollama-model-selector label {
            font-weight: 600;
            color: #000;
        }

        .ollama-messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .ollama-message {
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 12px;
            word-wrap: break-word;
            white-space: pre-wrap;
            animation: slideIn 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.5;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .ollama-message.user {
            align-self: flex-end;
            background: #000000;
            color: white;
            border-bottom-right-radius: 4px;
            border: 1px solid #333;
        }

        .ollama-message.bot {
            align-self: flex-start;
            background: #f5f5f5;
            color: #000;
            border-bottom-left-radius: 4px;
            border: 1px solid #e0e0e0;
        }

        .ollama-message.system {
            align-self: center;
            background: #f0f0f0;
            color: #333;
            font-size: 12px;
            border-radius: 20px;
            padding: 6px 12px;
            border: 1px solid #d0d0d0;
        }

        .ollama-message.cancelled {
            align-self: center;
            background: #ffebee;
            color: #c62828;
            font-size: 12px;
            border-radius: 20px;
            padding: 6px 12px;
            border: 1px solid #ef9a9a;
        }

        .ollama-typing {
            display: flex;
            gap: 4px;
            padding: 10px;
        }

        .ollama-typing span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #999;
            animation: typing 1.4s infinite;
        }

        .ollama-typing span:nth-child(2) {
            animation-delay: 0.2s;
        }

        .ollama-typing span:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-10px);
            }
        }

        .ollama-input-area {
            padding: 15px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 10px;
            background: white;
        }

        .ollama-input-area input {
            flex: 1;
            padding: 10px 14px;
            border: 2px solid #000;
            border-radius: 20px;
            font-size: 14px;
            outline: none;
        }

        .ollama-input-area input:focus {
            border-color: #333;
        }

        .ollama-send-btn {
            background: #000000;
            color: white;
            border: 2px solid #000;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            transition: all 0.2s;
        }

        .ollama-send-btn:hover {
            background: #333;
            transform: scale(1.1);
        }

        .ollama-send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: #666;
        }

        .ollama-messages::-webkit-scrollbar {
            width: 8px;
        }

        .ollama-messages::-webkit-scrollbar-track {
            background: #f5f5f5;
        }

        .ollama-messages::-webkit-scrollbar-thumb {
            background: #000;
            border-radius: 4px;
        }

        .ollama-messages::-webkit-scrollbar-thumb:hover {
            background: #333;
        }

        .ollama-error {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 8px;
            margin: 10px 15px;
            font-size: 13px;
            border-left: 3px solid #f5c6cb;
        }
    `;

    // HTML Template
    function createChatbotHTML() {
        return `
            <div class="ollama-chatbot-container">
                <div class="ollama-popup-notification" id="ollama-popup-notification">
                    Want to chat? Click me! 😊
                    <button class="ollama-popup-close" id="ollama-popup-close">×</button>
                </div>
                <div class="ollama-chat-bubble" id="ollama-chat-bubble"></div>
                <div class="ollama-chat-window" id="ollama-chat-window">
                    <div class="ollama-chat-header" id="ollama-chat-header">
                        <div class="ollama-chat-title">
                            <span>💬</span>
                            <span>AI Assistant</span>
                        </div>
                        <div class="ollama-chat-controls">
                            <button class="ollama-chat-btn" id="ollama-minimize-btn" title="Minimize">−</button>
                            <button class="ollama-chat-btn" id="ollama-close-btn" title="Close">×</button>
                        </div>
                    </div>
                    <div class="ollama-chat-body">
                        <div class="ollama-model-selector">
                            <label style="font-size: 13px; color: #666;">Model:</label>
                            <select id="ollama-model-select">
                                <option value="">Loading models...</option>
                            </select>
                        </div>
                        <div class="ollama-messages" id="ollama-messages"></div>
                        <div class="ollama-input-area">
                            <input 
                                type="text" 
                                id="ollama-input" 
                                placeholder="Type your message..." 
                                autocomplete="off"
                            />
                            <button class="ollama-send-btn" id="ollama-send-btn">▶</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Inject styles
    function injectStyles() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // Inject HTML
    function injectHTML() {
        const container = document.createElement('div');
        container.innerHTML = createChatbotHTML();
        document.body.appendChild(container.firstElementChild);
    }

    // Get recent conversation history (last N turns)
    function getRecentHistory() {
        const maxMessages = CONFIG.maxMemoryTurns * 2; // Each turn = user + assistant
        const recentHistory = state.conversationHistory.slice(-maxMessages);
        return recentHistory;
    }

    // Build context for API request
    function buildContext(newMessage) {
        const recentHistory = getRecentHistory();
        
        // Build the prompt with conversation history
        let contextPrompt = CONFIG.systemPrompt + "\n\n";
        
        if (recentHistory.length > 0) {
            contextPrompt += "Recent conversation:\n";
            recentHistory.forEach(msg => {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                contextPrompt += `${role}: ${msg.content}\n`;
            });
            contextPrompt += "\n";
        }
        
        contextPrompt += `User: ${newMessage}\nAssistant:`;
        
        return contextPrompt;
    }

    // Fetch available Ollama models
    async function fetchModels() {
        try {
            const response = await fetch(`${CONFIG.ollamaApiUrl}/api/tags`);
            const data = await response.json();
            
            if (data.models && data.models.length > 0) {
                state.availableModels = data.models.map(m => m.name);
                state.selectedModel = state.availableModels[0];
                updateModelSelector();
                addSystemMessage(`Found ${state.availableModels.length} model(s). Using: ${state.selectedModel}`);
            } else {
                addSystemMessage('No Ollama models found. Please install models first.');
            }
        } catch (error) {
            console.error('Failed to fetch Ollama models:', error);
            addSystemMessage('⚠️ Could not connect to Ollama. Is it running?');
        }
    }

    // Update model selector dropdown
    function updateModelSelector() {
        const select = document.getElementById('ollama-model-select');
        select.innerHTML = state.availableModels
            .map(model => `<option value="${model}">${model}</option>`)
            .join('');
        select.value = state.selectedModel;
    }

    // Add cancelled message
    function addCancelledMessage() {
        const messagesContainer = document.getElementById('ollama-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ollama-message cancelled';
        messageDiv.textContent = '⚠️ Request cancelled - Model changed';
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Add message to chat
    function addMessage(content, type = 'bot') {
        const messagesContainer = document.getElementById('ollama-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ollama-message ${type}`;
        
        // Create text content without any formatting
        const textNode = document.createTextNode(content);
        messageDiv.appendChild(textNode);
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Add system message
    function addSystemMessage(content) {
        const messagesContainer = document.getElementById('ollama-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ollama-message system';
        messageDiv.textContent = content;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Show typing indicator
    function showTyping() {
        const messagesContainer = document.getElementById('ollama-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ollama-message bot';
        typingDiv.id = 'ollama-typing-indicator';
        typingDiv.innerHTML = '<div class="ollama-typing"><span></span><span></span><span></span></div>';
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Remove typing indicator
    function removeTyping() {
        const typingIndicator = document.getElementById('ollama-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Send message to Ollama
    async function sendMessage(message) {
        if (!message.trim() || !state.selectedModel) return;

        // Cancel any ongoing request
        if (state.abortController) {
            state.abortController.abort();
            removeTyping();
            addCancelledMessage();
        }

        // Add user message
        addMessage(message, 'user');
        state.conversationHistory.push({ role: 'user', content: message });

        // Show typing indicator
        showTyping();
        state.isLoading = true;

        // Clear input
        document.getElementById('ollama-input').value = '';
        
        // Update send button state
        updateSendButton();

        // Create new abort controller for this request
        state.abortController = new AbortController();

        // Build context with conversation history
        const contextPrompt = buildContext(message);

        try {
            const response = await fetch(`${CONFIG.ollamaApiUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: state.selectedModel,
                    prompt: contextPrompt,
                    stream: false
                }),
                signal: state.abortController.signal
            });

            const data = await response.json();
            
            removeTyping();
            state.isLoading = false;
            state.abortController = null;
            updateSendButton();
            
            if (data.response) {
                // Extract raw text only, remove any markdown or formatting
                const rawText = data.response.trim();
                addMessage(rawText, 'bot');
                state.conversationHistory.push({ role: 'assistant', content: rawText });
            } else {
                addMessage('Sorry, I could not generate a response.', 'bot');
            }
        } catch (error) {
            removeTyping();
            state.isLoading = false;
            state.abortController = null;
            updateSendButton();
            
            if (error.name === 'AbortError') {
                // Request was cancelled, message already added
                console.log('Request cancelled by user');
            } else {
                console.error('Error sending message:', error);
                addMessage('⚠️ Error: Could not reach Ollama. Please check if it\'s running.', 'bot');
            }
        }
    }

    // Update send button state
    function updateSendButton() {
        const sendBtn = document.getElementById('ollama-send-btn');
        const input = document.getElementById('ollama-input');
        
        if (state.isLoading) {
            sendBtn.disabled = true;
            input.disabled = true;
        } else {
            sendBtn.disabled = false;
            input.disabled = false;
        }
    }

    // Toggle chat window
    function toggleChat() {
        state.isOpen = !state.isOpen;
        const chatWindow = document.getElementById('ollama-chat-window');
        const bubble = document.getElementById('ollama-chat-bubble');
        
        if (state.isOpen) {
            chatWindow.classList.add('open');
            bubble.style.display = 'none';
            if (state.availableModels.length === 0) {
                fetchModels();
            }
        } else {
            chatWindow.classList.remove('open');
            bubble.style.display = 'flex';
        }
    }

    // Minimize chat
    function minimizeChat() {
        const chatWindow = document.getElementById('ollama-chat-window');
        chatWindow.classList.toggle('minimized');
        state.isMinimized = !state.isMinimized;
    }

    // Close chat
    function closeChat() {
        state.isOpen = false;
        const chatWindow = document.getElementById('ollama-chat-window');
        const bubble = document.getElementById('ollama-chat-bubble');
        chatWindow.classList.remove('open');
        bubble.style.display = 'flex';
    }

    // Show popup notification
    function showPopupNotification() {
        const popup = document.getElementById('ollama-popup-notification');
        
        // Show popup after a brief delay
        setTimeout(() => {
            popup.classList.add('show');
        }, 500);

        // Hide popup after 3 seconds
        setTimeout(() => {
            popup.classList.remove('show');
        }, 3500);
    }

    // Attach event listeners
    function attachEventListeners() {
        document.getElementById('ollama-chat-bubble').addEventListener('click', toggleChat);
        document.getElementById('ollama-close-btn').addEventListener('click', closeChat);
        document.getElementById('ollama-minimize-btn').addEventListener('click', minimizeChat);
        
        // Close popup manually
        document.getElementById('ollama-popup-close').addEventListener('click', () => {
            const popup = document.getElementById('ollama-popup-notification');
            popup.classList.remove('show');
        });
        
        document.getElementById('ollama-send-btn').addEventListener('click', () => {
            const input = document.getElementById('ollama-input');
            sendMessage(input.value);
        });

        document.getElementById('ollama-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage(e.target.value);
            }
        });

        document.getElementById('ollama-model-select').addEventListener('change', (e) => {
            const previousModel = state.selectedModel;
            state.selectedModel = e.target.value;
            
            // Cancel any ongoing request when model changes
            if (state.abortController && state.isLoading) {
                state.abortController.abort();
                removeTyping();
                addCancelledMessage();
                state.isLoading = false;
                state.abortController = null;
                updateSendButton();
            }
            
            addSystemMessage(`Switched from ${previousModel} to ${state.selectedModel}`);
        });

        // Make header draggable
        makeDraggable();
        
        // Show popup notification on load
        showPopupNotification();
    }

    // Make chat window draggable
    function makeDraggable() {
        const header = document.getElementById('ollama-chat-header');
        const chatWindow = document.getElementById('ollama-chat-window');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.ollama-chat-controls')) return;
            isDragging = true;
            initialX = e.clientX - chatWindow.offsetLeft;
            initialY = e.clientY - chatWindow.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                chatWindow.style.left = currentX + 'px';
                chatWindow.style.top = currentY + 'px';
                chatWindow.style.right = 'auto';
                chatWindow.style.bottom = 'auto';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // Initialize chatbot
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                injectStyles();
                injectHTML();
                attachEventListeners();
            });
        } else {
            injectStyles();
            injectHTML();
            attachEventListeners();
        }
    }

    // Public API
    return {
        init: init,
        open: toggleChat,
        close: closeChat,
        sendMessage: sendMessage
    };
})();

// Auto-initialize if you want it to load automatically
// Uncomment the line below to auto-start:
// OllamaChatbot.init();
