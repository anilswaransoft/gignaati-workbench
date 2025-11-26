(async function () {
    // ==========================================
    // 1. CONFIGURATION
    // ==========================================
    const OLLAMA_API = "http://localhost:11434";
    const DEFAULT_MODEL = "llama3.2:1b";
    const MAX_MEMORY = 8;

    // We use a tiny version of Whisper for fast, local speech-to-text
    const WHISPER_MODEL = 'Xenova/whisper-tiny.en';

    const SYSTEM_PROMPT = `System Role:
You are the Gignaati Workbench Assistant.
Your primary job is to analyze attached files and help users navigate the UI.`;

    // ==========================================
    // 2. STATE MANAGEMENT
    // ==========================================
    let state = {
        availableModels: [],
        selectedModel: DEFAULT_MODEL,
        conversationHistory: [],
        attachments: [],
        isGenerating: false,
        abortController: null,

        // Voice State
        isRecording: false,
        audioChunks: [],
        mediaRecorder: null,
        transcriber: null, // Will hold the AI model
        isModelLoading: false,
        lastBotResponse: ""
    };

    // ==========================================
    // 3. LIBRARY LOADING (PDF + DOCX)
    // ==========================================
    async function loadScripts() {
        const scripts = [
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
            "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"
        ];
        for (const src of scripts) {
            if (!document.querySelector(`script[src="${src}"]`)) {
                const script = document.createElement("script");
                script.src = src; script.async = false; script.crossOrigin = "anonymous";
                document.head.appendChild(script);
            }
        }
        const checkInterval = setInterval(() => {
            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                clearInterval(checkInterval);
            }
        }, 500);
    }

    async function waitForLibrary(libName) {
        if (window[libName]) return true;
        return new Promise(resolve => {
            let retries = 0;
            const interval = setInterval(() => {
                retries++;
                if (window[libName]) { clearInterval(interval); resolve(true); }
                if (retries > 100) { clearInterval(interval); resolve(false); }
            }, 100);
        });
    }

    // ==========================================
    // 4. UI ELEMENT SELECTION (Binding to New HTML)
    // ==========================================
    const chatContainer = document.getElementById("chatbot-container");
    const headerContent = document.getElementById("header-content");
    const msgBox = document.getElementById("ollama-messages");
    const sendBtn = document.getElementById("ollama-send-btn");
    const input = document.getElementById("ollama-input");
    const modelSelect = document.getElementById("ollama-model-select");
    const ttsBtn = document.getElementById("tts-btn");
    const quickActions = document.getElementById("quick-actions");

    // New Elements from your HTML structure
    const fileInput = document.getElementById("gn-file-input");
    const attachBtn = document.getElementById("gn-attach-btn");
    const micBtn = document.getElementById("mic-btn");
    const previewArea = document.getElementById("gn-preview-area");

    const ICON_SEND = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
    const ICON_STOP = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>`;

    // ==========================================
    // 5. INPUT CONTROLS & EVENT BINDING
    // ==========================================
    function setupInputControls() {
        // 1. Bind File Input
        if (fileInput) {
            fileInput.addEventListener("change", handleFileSelect);
        }

        // 2. Bind Mic Button
        if (micBtn) {
            micBtn.onclick = handleVoiceToggle;
        }

        // 3. Drag and Drop Logic on the main container
        if (chatContainer) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                chatContainer.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
            });

            chatContainer.addEventListener('dragenter', () => chatContainer.classList.add('gn-drag-active'));
            chatContainer.addEventListener('dragleave', () => chatContainer.classList.remove('gn-drag-active'));
            chatContainer.addEventListener('drop', (e) => {
                chatContainer.classList.remove('gn-drag-active');
                if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
            });
        }
    }

    // Helper: Switch UI to "Active Chat Mode" (Hides title/cards, moves input down)
    function activateChatUI() {
        if (chatContainer) {
            chatContainer.classList.add("gn-chat-active");
        }
    }

    // ==========================================
    // 6. LOCAL VOICE LOGIC (Transformers.js)
    // ==========================================

    // 6a. Dynamic Import for Transformers.js
    async function loadWhisper() {
        if (state.transcriber) return state.transcriber;

        state.isModelLoading = true;
        // input.placeholder = "Downloading AI voice model (one-time)...";
        input.placeholder = "Loading...";

        try {
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.16.1');
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            state.transcriber = await pipeline('automatic-speech-recognition', WHISPER_MODEL);
            state.isModelLoading = false;
            input.placeholder = "Ask anything about Gignaati Workbench";
            return state.transcriber;
        } catch (e) {
            console.error("AI Model Load Failed:", e);
            state.isModelLoading = false;
            input.placeholder = "Voice not available. Check console.";
            alert("Failed to load Voice AI. Please check your internet connection.");
            return null;
        }
    }

    // 6b. Toggle Logic
    async function handleVoiceToggle() {
        if (state.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    // 6c. Start Recording
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.mediaRecorder = new MediaRecorder(stream);
            state.audioChunks = [];

            state.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) state.audioChunks.push(e.data);
            };

            state.mediaRecorder.start();
            state.isRecording = true;
            micBtn.classList.add("gn-mic-active"); // Ensure this CSS class exists for visual feedback
            input.placeholder = "Listening... (Click mic to stop)";

            if (!state.transcriber && !state.isModelLoading) loadWhisper();

        } catch (err) {
            console.error("Mic access denied:", err);
            alert("Could not access microphone. Please check system permissions.");
        }
    }

    // 6d. Stop & Transcribe
    async function stopRecording() {
        if (!state.mediaRecorder) return;

        state.mediaRecorder.stop();
        state.isRecording = false;
        micBtn.classList.remove("gn-mic-active");
        input.placeholder = "Processing audio...";

        await new Promise(resolve => state.mediaRecorder.onstop = resolve);
        state.mediaRecorder.stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(state.audioChunks, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
    }

    // 6e. Transcribe using Transformers.js
    async function transcribeAudio(audioBlob) {
        const transcriber = await loadWhisper();
        if (!transcriber) {
            input.placeholder = "Ask anything about Gignaati Workbench";
            return;
        }

        try {
            const url = URL.createObjectURL(audioBlob);
            const output = await transcriber(url);

            if (output && output.text) {
                const text = output.text.trim();
                if (text.length > 0) {
                    input.value = text;
                    setTimeout(() => sendMessage(), 500);
                } else {
                    input.placeholder = "No speech detected.";
                }
            }
        } catch (e) {
            console.error("Transcription failed:", e);
            input.placeholder = "Error processing audio.";
        } finally {
            setTimeout(() => {
                if (input.placeholder !== "Ask anything about Gignaati Workbench") {
                    input.placeholder = "Ask anything about Gignaati Workbench";
                }
            }, 2000);
        }
    }

    // ==========================================
    // 7. FILE HANDLING
    // ==========================================
    async function handleFileSelect(e) { handleFiles(e.target.files); }

    async function handleFiles(files) {
        const fileList = Array.from(files);

        // Create a temp loading indicator in the preview area
        const loadingMsg = document.createElement("div");
        loadingMsg.className = "gn-file-card";
        loadingMsg.innerHTML = `<div class="gn-loading-spinner"></div> Parsing...`;
        previewArea.appendChild(loadingMsg);

        for (const file of fileList) { await processFile(file); }

        loadingMsg.remove();
        if (fileInput) fileInput.value = "";
        renderPreviews();
    }

    async function processFile(file) {
        if (file.size > 10 * 1024 * 1024) { alert(`File ${file.name} too large.`); return; }
        try {
            if (file.type.startsWith("image/")) {
                const base64 = await readFileAsDataURL(file);
                state.attachments.push({ type: 'image', name: file.name, content: base64 });
            } else if (file.type === "application/pdf") {
                const ready = await waitForLibrary("pdfjsLib");
                if (!ready) return alert("PDF Lib failed.");
                if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                const pdf = await window.pdfjsLib.getDocument({ data: await readFileAsArrayBuffer(file) }).promise;
                let txt = "";
                for (let i = 1; i <= pdf.numPages; i++) txt += (await (await pdf.getPage(i)).getTextContent()).items.map(s => s.str).join(" ") + "\n";
                state.attachments.push({ type: 'text', name: file.name, content: txt });
            } else if (file.type.includes("wordprocessingml")) {
                const ready = await waitForLibrary("mammoth");
                if (!ready) return alert("DOCX Lib failed.");
                const res = await window.mammoth.extractRawText({ arrayBuffer: await readFileAsArrayBuffer(file) });
                state.attachments.push({ type: 'text', name: file.name, content: res.value });
            } else {
                state.attachments.push({ type: 'text', name: file.name, content: await readFileAsText(file) });
            }
        } catch (err) { console.error(err); }
    }

    const readFileAsDataURL = (f) => new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(f); });
    const readFileAsText = (f) => new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsText(f); });
    const readFileAsArrayBuffer = (f) => new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsArrayBuffer(f); });

    function renderPreviews() {
        previewArea.innerHTML = "";
        state.attachments.forEach((att, i) => {
            const card = document.createElement("div");
            card.className = "gn-file-card";
            // Styling handled in CSS, simplified here
            let icon = att.type === 'image' ? `<img src="${att.content}" class="gn-file-thumb" style="height:20px; border-radius:4px;" />` : "📄";
            card.innerHTML = `${icon}<span style="margin-left:5px">${att.name.substring(0, 10)}...</span><span class="gn-remove-file" data-idx="${i}">×</span>`;
            card.querySelector(".gn-remove-file").onclick = (e) => { state.attachments.splice(e.target.getAttribute("data-idx"), 1); renderPreviews(); };
            previewArea.appendChild(card);
        });
    }

    // ==========================================
    // 8. MESSAGING & STOP
    // ==========================================
    function updateButtonState(gen) {
        state.isGenerating = gen;
        if (sendBtn) {
            sendBtn.innerHTML = gen ? ICON_STOP : ICON_SEND;
            // Change button color: Red for stop, Black (default) for send
            sendBtn.style.backgroundColor = gen ? "#dc3545" : "#000";
        }
    }

    function stopGeneration() {
        if (state.abortController) { state.abortController.abort(); state.abortController = null; removeTyping(); updateButtonState(false); }
    }

    function addMessage(text, type = "bot") {
        const msg = document.createElement("div");
        msg.className = `gn-ollama-message gn-${type}`;
        const contentDiv = document.createElement("div");
        contentDiv.className = "gn-msg-content";
        contentDiv.textContent = text;
        msg.appendChild(contentDiv);

        if (type === "bot") {
            const copyBtn = document.createElement("button");
            copyBtn.className = "gn-copy-btn";
            copyBtn.innerHTML = "📋";
            copyBtn.style.marginLeft = "10px";
            copyBtn.onclick = async () => {
                await navigator.clipboard.writeText(contentDiv.textContent);
                copyBtn.innerHTML = "✅"; setTimeout(() => copyBtn.innerHTML = "📋", 2000);
            };
            // msg.appendChild(copyBtn);
            msg.appendChild(createTranslateContainer(text, "en"));
            state.lastBotResponse = text;
        }
        msgBox.appendChild(msg);
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    function showTyping() {
        const div = document.createElement("div");
        div.className = "gn-ollama-message gn-bot";
        div.id = "ollama-typing-indicator";
        // Simple typing dots
        div.innerHTML = '<div class="gn-ollama-typing"><span>Loading.</span><span>.</span><span>.</span></div>';
        msgBox.appendChild(div);
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    function removeTyping() { const el = document.getElementById("ollama-typing-indicator"); if (el) el.remove(); }
    // function buildContext(n) { return SYSTEM_PROMPT + "\n\n" + state.conversationHistory.slice(-MAX_MEMORY*2).map(m=>`${m.role==="user"?"User":"Assistant"}: ${m.content}`).join("\n") + `\nUser: ${n}\nAssistant:`; }
    function buildContext(n) { return state.conversationHistory.slice(-MAX_MEMORY * 2).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n") + `\nUser: ${n}\nAssistant:`; }

    async function fetchModels() {
        try {
            const res = await fetch(`${OLLAMA_API}/api/tags`);
            const data = await res.json();
            if (data.models?.length) {
                state.availableModels = data.models.map(m => m.name);
                if (modelSelect) modelSelect.innerHTML = state.availableModels.map(m => `<option value="${m}">${m}</option>`).join("");
                state.selectedModel = state.availableModels[0];
            } else {
                if (modelSelect) modelSelect.innerHTML = "<option>No models found</option>";
            }
        } catch (e) {
            if (modelSelect) modelSelect.innerHTML = "<option>Offline</option>";
        }
    }

    async function handleSendClick() { if (state.isGenerating) stopGeneration(); else sendMessage(); }

    async function sendMessage() {
        let msg = input.value.trim();
        if (!msg && state.attachments.length > 0) msg = "Summarize attached files.";
        if (!msg && state.attachments.length === 0) return;

        // ** UI CHANGE: TRIGGER ACTIVE CHAT MODE **
        activateChatUI();

        input.placeholder = "Ask anything about Gignaati Workbench";

        let displayMsg = state.attachments.length > 0 ? `${state.attachments.map(a => `[${a.name}]`).join(" ")} ${msg}` : msg;
        addMessage(displayMsg, "user");
        input.value = ""; previewArea.innerHTML = "";

        state.abortController = new AbortController();
        updateButtonState(true); showTyping();

        const req = { model: state.selectedModel, stream: false };
        const imgs = state.attachments.filter(a => a.type === 'image').map(a => a.content.split(',')[1]);
        if (imgs.length) req.images = imgs;

        let prompt = buildContext(msg);
        const txts = state.attachments.filter(a => a.type === 'text');
        if (txts.length) {
            prompt += "\n\n--- FILES ---\n";
            txts.forEach(f => prompt += `NAME: ${f.name}\nCONTENT:\n${f.content}\n\n`);
            prompt += "--- END FILES ---\nAnalyze the above files.";
        }
        req.prompt = prompt;
        state.attachments = [];
        state.conversationHistory.push({ role: "user", content: displayMsg });

        try {
            const res = await fetch(`${OLLAMA_API}/api/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req), signal: state.abortController.signal });
            const data = await res.json();
            removeTyping();
            if (data.response) {
                addMessage(data.response.trim(), "bot");
                state.conversationHistory.push({ role: "assistant", content: data.response.trim() });

                // --- ADD THIS NEW LINE HERE ---
                if (typeof window.saveChatHistory === 'function') {
                    // displayMsg is the user request, data.response is the bot response
                    window.saveChatHistory(displayMsg, data.response.trim());
                }
                // ------------------------------


            } else addMessage("No response.", "bot");
        } catch (e) {
            removeTyping();
            if (e.name !== 'AbortError') addMessage("Error reaching Ollama. Is it running?", "bot");
        } finally {
            updateButtonState(false); state.abortController = null;
        }
    }

    // ==========================================
    // 9. TRANSLATION (Google Translate Logic)
    // ==========================================
    // function speakText(t) { if(!t)return; const u=new SpeechSynthesisUtterance(t); u.lang="en-US"; speechSynthesis.cancel(); speechSynthesis.speak(u); }

    // function speakText() {
    //     // 1. TOGGLE STOP: If currently speaking, stop and return.
    //     if (window.speechSynthesis.speaking) {
    //         window.speechSynthesis.cancel();
    //         return;
    //     }

    //     // 2. GET CONTENT: Find the very last bot message in the UI
    //     // We read from the DOM because that is where the TRANSLATED text lives.
    //     const botMessages = document.querySelectorAll('.gn-ollama-message.gn-bot');
    //     if (botMessages.length === 0) return;

    //     const lastMessage = botMessages[botMessages.length - 1];
    //     const contentDiv = lastMessage.querySelector('.gn-msg-content');

    //     if (!contentDiv || !contentDiv.textContent.trim()) return;
    //     const textToRead = contentDiv.textContent;

    //     // 3. DETECT LANGUAGE: Check the dropdown setting for that specific message
    //     const dropdown = lastMessage.querySelector('.gn-translate-dropdown');
    //     let lang = 'en-US'; // Default

    //     if (dropdown && dropdown.value) {
    //         // If the user selected 'hi', 'es', etc., use that.
    //         lang = dropdown.value; 
    //     }

    //     // 4. SPEAK
    //     const utterance = new SpeechSynthesisUtterance(textToRead);
    //     utterance.lang = lang; // This ensures the voice matches the text language

    //     // Optional: Reset button icon when done (if you want to implement visual feedback later)
    //     utterance.onend = () => { /* Audio finished */ };

    //     window.speechSynthesis.speak(utterance);
    // }

    window.activeUtterance = null;

    function speakText() {
        // 1. STOP IF SPEAKING
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            return;
        }

        // 2. GET CONTENT
        const botMessages = document.querySelectorAll('.gn-ollama-message.gn-bot');
        if (botMessages.length === 0) return;

        const lastMessage = botMessages[botMessages.length - 1];
        const contentDiv = lastMessage.querySelector('.gn-msg-content');
        if (!contentDiv || !contentDiv.textContent.trim()) return;

        const textToRead = contentDiv.textContent;

        // 3. DETERMINE LANGUAGE
        const dropdown = lastMessage.querySelector('.gn-translate-dropdown');
        const shortLang = dropdown ? dropdown.value : 'en';

        // Map codes to full locales (Electron requires full locale often)
        const localeMap = {
            'en': 'en-US', 'hi': 'hi-IN', 'es': 'es-ES', 'fr': 'fr-FR',
            'de': 'de-DE', 'it': 'it-IT', 'pt': 'pt-PT', 'ru': 'ru-RU',
            'ja': 'ja-JP', 'zh': 'zh-CN', 'ko': 'ko-KR', 'ar': 'ar-SA'
        };
        const targetLang = localeMap[shortLang] || 'en-US';

        // 4. FETCH VOICES (Handle Electron Async Loading)
        let voices = window.speechSynthesis.getVoices();

        // If Electron hasn't loaded voices yet, wait for them
        if (voices.length === 0) {
            console.log("Voices not loaded yet. Waiting...");
            window.speechSynthesis.onvoiceschanged = () => {
                // Remove listener to prevent loops and try again
                window.speechSynthesis.onvoiceschanged = null;
                speakText();
            };
            return;
        }

        // 5. FIND MATCHING VOICE
        // Log to console so you can see what voices Electron detects (Ctrl+Shift+I)
        console.log(`Attempting to speak in: ${targetLang}`);

        const matchingVoice = voices.find(v => v.lang === targetLang) ||
            voices.find(v => v.lang.startsWith(shortLang));

        if (!matchingVoice) {
            console.warn(`No voice found for ${targetLang}. Available voices:`, voices.map(v => v.lang));
            // Optional: Alert user if voice is missing
            // alert("Voice pack for this language is not installed on your OS.");
        }

        // 6. PREPARE UTTERANCE
        window.activeUtterance = new SpeechSynthesisUtterance(textToRead);
        window.activeUtterance.lang = targetLang;

        if (matchingVoice) {
            window.activeUtterance.voice = matchingVoice;
            console.log("Using voice:", matchingVoice.name);
        }

        // 7. SPEAK
        window.speechSynthesis.speak(window.activeUtterance);

        // Cleanup when done
        window.activeUtterance.onend = () => { window.activeUtterance = null; };
    }

    function splitTextSafe(text, maxSize = 400) {
        const chunks = [];
        if (text.length <= maxSize) return [text];

        const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
        let currentChunk = "";

        for (let sentence of sentences) {
            if ((currentChunk + sentence).length < maxSize) {
                currentChunk += sentence;
            } else {
                if (currentChunk) { chunks.push(currentChunk); currentChunk = ""; }
                if (sentence.length > maxSize) {
                    const words = sentence.split(" ");
                    for (let word of words) {
                        if ((currentChunk + " " + word).length < maxSize) {
                            currentChunk += (currentChunk ? " " : "") + word;
                        } else {
                            if (currentChunk) chunks.push(currentChunk);
                            currentChunk = word;
                        }
                    }
                } else { currentChunk = sentence; }
            }
        }
        if (currentChunk) chunks.push(currentChunk);
        return chunks;
    }

    async function translateText(text, targetLang, msgElement) {
        const contentDiv = msgElement.querySelector('.gn-msg-content');
        if (!contentDiv) return;

        try {
            contentDiv.textContent = "Translating...";

            const lines = text.split('\n');
            const translatedLines = [];

            for (let line of lines) {
                if (!line.trim()) {
                    translatedLines.push("");
                    continue;
                }

                let lineTranslation = "";
                // Split large text to avoid URL limit issues
                const lineChunks = splitTextSafe(line, 1000);

                for (let chunk of lineChunks) {
                    if (!chunk.trim()) {
                        lineTranslation += chunk;
                        continue;
                    }

                    let chunkTrans = null;

                    try {
                        // Use Google Translate API (Client-Side)
                        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
                        const res = await fetch(url);
                        const data = await res.json();

                        // Google returns an array of arrays
                        if (data && data[0]) {
                            chunkTrans = data[0].map(item => item[0]).join("");
                        }
                    } catch (e) { console.error("GT failed", e); }

                    // Fallback to original if translation fails
                    lineTranslation += (chunkTrans || chunk) + " ";
                }
                translatedLines.push(lineTranslation.trim());
            }

            contentDiv.textContent = translatedLines.join('\n') || text;

            // Update UI to show we are in translated state
            const existing = msgElement.querySelector(".gn-translate-container");
            if (existing) existing.remove();
            msgElement.appendChild(createTranslateContainer(text, targetLang));

        } catch (error) {
            console.error("Translation Error", error);
            contentDiv.textContent = text;
            const existing = msgElement.querySelector(".gn-translate-container");
            if (existing) existing.remove();
            msgElement.appendChild(createTranslateContainer(text, targetLang));
        }
    }

    function createTranslateContainer(originalText, currentLang) {
        const container = document.createElement("div");
        container.className = "gn-translate-container";
        container.style.marginTop = "10px";
        container.style.fontSize = "0.85rem";

        const label = document.createElement("label");
        label.className = "gn-translate-label";
        label.textContent = "Translate to: ";

        const dropdown = document.createElement("select");
        dropdown.className = "gn-translate-dropdown";
        dropdown.value = currentLang;
        // Basic styling for dropdown
        dropdown.style.marginLeft = "5px";
        dropdown.style.padding = "2px 5px";

        const languages = [
            { code: "en", name: "English" }, { code: "es", name: "Spanish" },
            { code: "fr", name: "French" }, { code: "de", name: "German" },
            { code: "it", name: "Italian" }, { code: "pt", name: "Portuguese" },
            { code: "ru", name: "Russian" }, { code: "ja", name: "Japanese" },
            { code: "zh", name: "Chinese" }, { code: "hi", name: "Hindi" }
        ];

        let optionsHTML = `<option value="en"${currentLang === 'en' ? ' selected' : ''}>English (Original)</option>`;
        languages.filter(l => l.code !== "en").forEach(l => {
            optionsHTML += `<option value="${l.code}"${l.code === currentLang ? ' selected' : ''}>${l.name}</option>`;
        });
        dropdown.innerHTML = optionsHTML;

        dropdown.addEventListener("change", (e) => {
            const selected = e.target.value;
            const msgEl = dropdown.closest(".gn-ollama-message");
            if (selected !== "en") {
                translateText(originalText, selected, msgEl);
            } else {
                // Reset to original
                const contentDiv = msgEl.querySelector('.gn-msg-content');
                if (contentDiv) contentDiv.textContent = originalText;
                const old = msgEl.querySelector(".gn-translate-container");
                if (old) old.remove();
                msgEl.appendChild(createTranslateContainer(originalText, "en"));
            }
        });

        label.appendChild(dropdown);
        container.appendChild(label);
        return container;
    }

    // ==========================================
    // 10. INIT
    // ==========================================
    loadScripts();
    setupInputControls();

    // Global function for quick actions
    window.quickPrompt = (prompt) => {
        activateChatUI(); // Ensure UI switches even on quick prompt
        input.value = prompt;
        sendMessage();
    };
    window.scrollToChat = () => { if (input) input.focus(); };
    //window.openExternalLink = (url) => window.open(url, '_blank');

    // if (ttsBtn) ttsBtn.addEventListener("click", () => speakText(state.lastBotResponse));
    if (ttsBtn) ttsBtn.addEventListener("click", speakText);
    if (sendBtn) { sendBtn.addEventListener("click", handleSendClick); }
    if (input) input.addEventListener("keypress", (e) => { if (e.key === "Enter" && !state.isGenerating) sendMessage(); });
    if (modelSelect) modelSelect.addEventListener("change", (e) => state.selectedModel = e.target.value);

    fetchModels();
})();



(function () {
    // 1. Check dependencies
    const container = document.getElementById("chatbot-container");
    if (!container) return;

    // 2. Inject Styles (Moved to Left Side)
    const styleId = 'gn-addon-new-chat-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* Floating New Chat Button - LEFT SIDE */
            #gn-addon-new-chat-btn {
                position: absolute;
                top: 80px;  /* Adjust vertical alignment */
                left: 20px; /* Moved to the Left */
                z-index: 999;
                display: none; /* Hidden by default */
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background-color: #f0f4f9; 
                color: #444746;
                border: 1px solid #e5e7eb;
                border-radius: 20px;
                font-family: sans-serif;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }

            /* Hover Effect */
            #gn-addon-new-chat-btn:hover {
                background-color: #e2e6ea;
                color: #1f1f1f;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            /* VISIBILITY LOGIC: Show only when chat is active */
            #chatbot-container.gn-chat-active #gn-addon-new-chat-btn {
                display: inline-flex;
                animation: gn-fade-in 0.3s forwards;
            }

            @keyframes gn-fade-in {
                from { opacity: 0; transform: translateX(-10px); }
                to { opacity: 1; transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }

    // 3. Create and Append the Button (if not exists)
    if (document.getElementById('gn-addon-new-chat-btn')) return;

    // const btn = document.createElement("button");
    // btn.id = "gn-addon-new-chat-btn";

    // Icon + Text
    // btn.innerHTML = `
    //     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    //         <line x1="12" y1="5" x2="12" y2="19"></line>
    //         <line x1="5" y1="12" x2="19" y2="12"></line>
    //     </svg>
    //     <span>New Chat</span>
    // `;

    // 4. Bind Action to existing global function
    // btn.onclick = function () {
    //     if (typeof window.startNewChat === 'function') {
    //         window.startNewChat();
    //     } else {
    //         window.location.reload();
    //     }
    // };

    //container.appendChild(btn);

})();





// ===================================================================
// === NEW IMPLEMENTATION: CHAT HISTORY FEATURE ===
// ===================================================================

(function () {
    // 1. Extend State for History
    // We try to find the existing 'state' variable in scope, otherwise we create a local extension
    // Note: This assumes this code runs in the same scope or we attach to window for the "New Chat" logic.

    // Generate UUID for Chat ID
    function generateUUID() {
        if (crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

   // Initialize Global Session ID
    if (!window.currentChatSessionId) {
        window.currentChatSessionId = generateUUID();
    }
    // Helper to get Email
    function getUserEmail() {
        const emailInput = document.querySelector(".email-box input");
        // Fallback to the hardcoded one from your curl example if input is empty
        return emailInput && emailInput.value ? emailInput.value : "anil.thakur@swaransoft.com";
    }

    // 2. API: Save Chat History
    window.saveChatHistory = async function (userRequest, response) {
        if (!window.currentChatSessionId) window.currentChatSessionId = generateUUID();
        const payload = {
            chatId: window.currentChatSessionId,
            emailId: getUserEmail(),
            request: userRequest,
            response: response
        };

        console.log("Saving history:", payload);

        try {
            await fetch('https://localhost:7029/api/Chat/InsertChatHistory', {
                method: 'POST',
                headers: {
                    'accept': 'text/plain',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("Failed to save chat history", e);
        }
    };

    // 3. API: Fetch History
    window.fetchChatHistory = async function () {
        const email = getUserEmail();
        const url = `https://localhost:7029/api/Chat/getChatHistory?emailId=${encodeURIComponent(email)}`;

        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: { 'accept': 'text/plain' }
            });
            const json = await res.json();
            if (json && json.data) {
                renderHistoryList(json.data);
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    };

    // 4. UI: Render History Sidebar
    function createHistorySidebar() {
        if (document.getElementById('gn-history-sidebar')) return;

        const container = document.getElementById("chatbot-container");

        // Sidebar HTML
        const sidebar = document.createElement('div');
        sidebar.id = 'gn-history-sidebar';
        sidebar.className = 'gn-hist-sidebar';
        sidebar.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;padding:20px;">
                <button class="gn-hist-close-btn" style="font-size: .9rem;font-weight: 700;" onclick="NewChat()">+ New Chat</button>
                <button class="gn-hist-close-btn" onclick="toggleHistorySidebar()">×</button>
            </div>
            
          
            <div class="gn-hist-list" id="gn-hist-list-container">
                <div style="text-align:center; padding:20px; color:#999;">Loading...</div>
            </div>

            <div class="gn-hist-header" style="padding:10px 10px">
                <h3 class="gn-hist-title" style=" font-size: .8rem;" >Data is secure on local environment</h3>
              
            </div>
        `;
        document.body.appendChild(sidebar);

        // Toggle Button (History)
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'gn-hist-toggle-btn';
        toggleBtn.innerHTML = `<span><img src="menu-icon-hi.png"></span>`;
        toggleBtn.onclick = toggleHistorySidebar;

          const newChatBtn = document.createElement('button');
        newChatBtn.onclick = NewChat;

        // Append to container
        if (container) container.appendChild(toggleBtn);
    }

    // 5. Logic: Toggle Sidebar
    window.toggleHistorySidebar = function () {
        const sidebar = document.getElementById('gn-history-sidebar');
        if (!sidebar) {
            createHistorySidebar();
            window.fetchChatHistory(); // Fetch on first open
            setTimeout(() => document.getElementById('gn-history-sidebar').classList.add('active'), 10);
        } else {
            sidebar.classList.toggle('active');
            if (sidebar.classList.contains('active')) {
                window.fetchChatHistory(); // Refresh data on open
            }
        }
    };

      window.NewChat = function () {
        if (typeof window.startNewChat === 'function') {
            window.startNewChat();
        } else {
            window.location.reload();
        }
    }
    // 6. Logic: Render List Items
    // function renderHistoryList(data) {
    //     const listContainer = document.getElementById('gn-hist-list-container');
    //     listContainer.innerHTML = '';

    //     if (!data || data.length === 0) {
    //         listContainer.innerHTML = '<div style="padding:10px; color:#666;">No history found.</div>';
    //         return;
    //     }

    //     data.forEach((session, index) => {
    //         if (!session.chats || session.chats.length === 0) return;

    //         // Use the first interaction to represent the session
    //         const firstChat = session.chats[0];
    //         const dateStr = new Date(firstChat.createdOn).toLocaleString();

    //         const item = document.createElement('div');
    //         item.className = 'gn-hist-item';
    //         item.innerHTML = `
    //             <span class="gn-hist-date">${dateStr}</span>
    //             <div class="gn-hist-query">${firstChat.request}</div>
    //         `;

    //         // Click to load this session
    //         item.onclick = () => loadHistorySession(session.chats);
    //         listContainer.appendChild(item);
    //     });
    // }
    function renderHistoryList(data) {
        const listContainer = document.getElementById('gn-hist-list-container');
        if(!listContainer) return;
        listContainer.innerHTML = '';

        if (!data || data.length === 0) {
            listContainer.innerHTML = '<div style="padding:20px; text-align:center; font-size:0.85rem; color:#666;">No recent chats</div>';
            return;
        }

        const label = document.createElement('div');
        label.className = 'gn-hist-section-label';
        label.innerText = 'Recent';
        listContainer.appendChild(label);

        data.forEach(session => {
            // Validation: Ensure session has chats
            if (!session.chats || session.chats.length === 0) return;
            
            // LOGIC: Pick the first chat object to get the ID
            const firstChat = session.chats[0];
            const sessionId = firstChat.chatId; // Extract ID from API

            const item = document.createElement('div');
            item.className = 'gn-hist-item';
            item.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2-2z"></path>
                </svg>
                <span style="overflow:hidden;text-overflow:ellipsis;">${firstChat.request}</span>
            `;
            
            // On Click: Load this specific Session ID
            item.onclick = () => loadHistorySession(session.chats, sessionId);
            listContainer.appendChild(item);
        });
    }

   // 4. Load Session (Robust Fix)
    function loadHistorySession(chats, chatId) {
        console.log("Loading session:", chatId);

        // 1. Select Elements Directly (Fixes scope issues)
        const container = document.getElementById("chatbot-container");
        const msgBox = document.getElementById("ollama-messages");
        const input = document.getElementById("ollama-input");
        const header = document.getElementById("header-content");
        const quickActions = document.getElementById("quick-actions");

        // 2. Force UI into "Chat Mode"
        if (container) container.classList.add("gn-chat-active");
        
        // Extra safeguard: Manually hide welcome elements if class fails
        if (header) header.style.display = 'none';
        if (quickActions) quickActions.style.display = 'none';
        if (msgBox) msgBox.style.display = 'block';

        // 3. Reset State & UI
        if (msgBox) msgBox.innerHTML = '';
        if (input) input.value = '';
        
        // Update State (if 'state' variable is accessible, otherwise ignore)
        if (typeof state !== 'undefined') {
            state.conversationHistory = [];
            state.chatSessionId = chatId;
        } else {
            // Fallback: Store ID on window if state is missing
            window.currentChatSessionId = chatId;
        }

        // 4. Render Messages
        if (chats && Array.isArray(chats)) {
            chats.forEach(chat => {
                // Render User Message
                safeAddMessage(chat.request, 'user');
                
                // Render Bot Message
                safeAddMessage(chat.response, 'bot');

                // Restore Context
                if (typeof state !== 'undefined') {
                    state.conversationHistory.push({ role: "user", content: chat.request });
                    state.conversationHistory.push({ role: "assistant", content: chat.response });
                }
            });
        }
        
        // 5. Scroll to bottom
        if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;

        // 6. Close Sidebar (on mobile)
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('gn-hist-sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }
    }

    // Helper: Safely add message to UI (Self-contained)
    function safeAddMessage(text, type) {
        const msgBox = document.getElementById("ollama-messages");
        if (!msgBox) return;

        const msg = document.createElement("div");
        msg.className = `gn-ollama-message gn-${type}`; // e.g., gn-user or gn-bot
        
        const contentDiv = document.createElement("div");
        contentDiv.className = "gn-msg-content";
        contentDiv.textContent = text;
        
        msg.appendChild(contentDiv);
        msgBox.appendChild(msg);
    }

    // Helper to reuse existing UI logic without breaking encapsulation
    function addMessageUI(text, type) {
        const msgBox = document.getElementById("ollama-messages");
        const msg = document.createElement("div");
        msg.className = `gn-ollama-message gn-${type}`;
        const contentDiv = document.createElement("div");
        contentDiv.className = "gn-msg-content";
        contentDiv.textContent = text;
        msg.appendChild(contentDiv);
        msgBox.appendChild(msg);
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    // 8. Hook into "New Chat"
    // Override or extend the existing startNewChat if exposed, or create it
    const originalStartNewChat = window.startNewChat;
    window.startNewChat = function () {
        window.currentChatSessionId = generateUUID(); // Generate NEW UNIQUE ID
        console.log("New Chat Started. ID:", window.currentChatSessionId);

        if (typeof originalStartNewChat === 'function') {
            originalStartNewChat();
        } else {
            // Default clear logic if original not found
            const msgBox = document.getElementById("ollama-messages");
            if (msgBox) msgBox.innerHTML = '';
            const input = document.getElementById("ollama-input");
            if (input) input.value = '';
            document.getElementById("chatbot-container").classList.remove("gn-chat-active");
        }
    };

    // Initial Setup
    createHistorySidebar();

})();