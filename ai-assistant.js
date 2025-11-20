(async function () {
    // ==========================================
    // 1. CONFIGURATION
    // ==========================================
    const OLLAMA_API = "http://localhost:11434";
    const DEFAULT_MODEL = "llama2"; 
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
        isModelLoading: false
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

    // Get Elements
    const msgBox = document.getElementById("ollama-messages");
    const sendBtn = document.getElementById("ollama-send-btn");
    const input = document.getElementById("ollama-input");
    const modelSelect = document.getElementById("ollama-model-select");
    const ttsBtn = document.getElementById("tts-btn");
    const quickActions = document.getElementById("quick-actions");

    // Hide old buttons if they exist in HTML
    const oldMic = document.getElementById("mic-btn");
    if(oldMic) oldMic.style.display = "none";

    const ICON_SEND = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
    const ICON_STOP = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>`;

    // ==========================================
    // 5. UI SETUP
    // ==========================================
    let fileInput, previewArea, micBtn; 

    function setupInputControls() {
        if (!input) return;
        if (input.parentNode.classList.contains("gn-input-wrapper")) return;

        // Create Wrapper
        const wrapper = document.createElement("div");
        wrapper.className = "gn-input-wrapper";
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        // File Input
        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.accept = "image/*,.pdf,.docx,.txt,.md,.json,.js,.csv,.css,.html"; 
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);

        // Attach Button
        const attachBtn = document.createElement("button");
        attachBtn.className = "gn-attach-btn";
        attachBtn.innerHTML = `+`; 
        attachBtn.title = "Attach file";
        attachBtn.onclick = () => fileInput.click();
        wrapper.insertBefore(attachBtn, input);

        // Mic Button
        micBtn = document.createElement("button");
        micBtn.className = "gn-mic-btn";
        micBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
        micBtn.title = "Voice Input (Click to Record, Click again to Send)";
        micBtn.onclick = handleVoiceToggle;
        wrapper.appendChild(micBtn);

        // Preview Area
        previewArea = document.createElement("div");
        previewArea.className = "gn-preview-area";
        wrapper.parentNode.insertBefore(previewArea, wrapper);

        // Events
        fileInput.addEventListener("change", handleFileSelect);
        
        const chatContainer = document.getElementById("chatbot-container") || document.body;
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

    // ==========================================
    // 6. LOCAL VOICE LOGIC (Transformers.js)
    // ==========================================

    // 6a. Dynamic Import for Transformers.js
    async function loadWhisper() {
        if (state.transcriber) return state.transcriber;
        
        state.isModelLoading = true;
        input.placeholder = "Downloading AI voice model (one-time)...";
        
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
            micBtn.classList.add("gn-mic-active");
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
        const loadingMsg = document.createElement("div");
        loadingMsg.className = "gn-file-card";
        loadingMsg.innerHTML = `<div class="gn-loading-spinner"></div> Parsing...`;
        previewArea.appendChild(loadingMsg);

        for (const file of fileList) { await processFile(file); }
        loadingMsg.remove();
        if(fileInput) fileInput.value = ""; 
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
                for(let i=1; i<=pdf.numPages; i++) txt += (await (await pdf.getPage(i)).getTextContent()).items.map(s=>s.str).join(" ")+"\n";
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

    const readFileAsDataURL = (f) => new Promise(r => { const fr=new FileReader(); fr.onload=e=>r(e.target.result); fr.readAsDataURL(f); });
    const readFileAsText = (f) => new Promise(r => { const fr=new FileReader(); fr.onload=e=>r(e.target.result); fr.readAsText(f); });
    const readFileAsArrayBuffer = (f) => new Promise(r => { const fr=new FileReader(); fr.onload=e=>r(e.target.result); fr.readAsArrayBuffer(f); });

    function renderPreviews() {
        previewArea.innerHTML = "";
        state.attachments.forEach((att, i) => {
            const card = document.createElement("div");
            card.className = "gn-file-card";
            let icon = att.type === 'image' ? `<img src="${att.content}" class="gn-file-thumb" />` : "📄";
            card.innerHTML = `${icon}<span>${att.name.substring(0,10)}...</span><span class="gn-remove-file" data-idx="${i}">×</span>`;
            card.querySelector(".gn-remove-file").onclick = (e) => { state.attachments.splice(e.target.getAttribute("data-idx"),1); renderPreviews(); };
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
            sendBtn.style.color = gen ? "#ef4444" : "#3b82f6";
        }
    }

    function stopGeneration() {
        if (state.abortController) { state.abortController.abort(); state.abortController=null; removeTyping(); updateButtonState(false); }
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
            copyBtn.innerHTML = "📋"; copyBtn.onclick = async () => {
                await navigator.clipboard.writeText(contentDiv.textContent);
                copyBtn.innerHTML = "✅"; setTimeout(() => copyBtn.innerHTML = "📋", 2000);
            };
            msg.appendChild(copyBtn);
            msg.appendChild(createTranslateContainer(text, "en"));
            state.lastBotResponse = text;
        }
        msgBox.appendChild(msg);
        msgBox.scrollTop = msgBox.scrollHeight;

        if (type === "user") {
            const chatContainer = document.getElementById("chatbot-container");
            const headerContent = document.getElementById("header-content");
            if (chatContainer) chatContainer.classList.add("gn-chat-active");
            if (headerContent) headerContent.classList.add("gn-hidden");
            if (quickActions) quickActions.classList.add('gn-hidden');
        }
    }

    function showTyping() {
        const div = document.createElement("div");
        div.className = "gn-ollama-message gn-bot";
        div.id = "ollama-typing-indicator";
        div.innerHTML = '<div class="gn-ollama-typing"><span></span><span></span><span></span></div>';
        msgBox.appendChild(div);
        msgBox.scrollTop = msgBox.scrollHeight;
    }
    function removeTyping() { const el = document.getElementById("ollama-typing-indicator"); if(el) el.remove(); }
    function buildContext(n) { return SYSTEM_PROMPT + "\n\n" + state.conversationHistory.slice(-MAX_MEMORY*2).map(m=>`${m.role==="user"?"User":"Assistant"}: ${m.content}`).join("\n") + `\nUser: ${n}\nAssistant:`; }

    async function fetchModels() {
        try {
            const res = await fetch(`${OLLAMA_API}/api/tags`);
            const data = await res.json();
            if (data.models?.length) {
                state.availableModels = data.models.map(m=>m.name);
                if(modelSelect) modelSelect.innerHTML = state.availableModels.map(m=>`<option value="${m}">${m}</option>`).join("");
                state.selectedModel = state.availableModels[0];
            }
        } catch {}
    }

    async function handleSendClick() { if (state.isGenerating) stopGeneration(); else sendMessage(); }

    async function sendMessage() {
        let msg = input.value.trim();
        if (!msg && state.attachments.length > 0) msg = "Summarize attached files.";
        if (!msg && state.attachments.length === 0) return;
        
        input.placeholder = "Ask anything about Gignaati Workbench";

        let displayMsg = state.attachments.length > 0 ? `${state.attachments.map(a=>`[${a.name}]`).join(" ")} ${msg}` : msg;
        addMessage(displayMsg, "user");
        input.value = ""; previewArea.innerHTML = ""; 
        
        state.abortController = new AbortController();
        updateButtonState(true); showTyping();

        const req = { model: state.selectedModel, stream: false };
        const imgs = state.attachments.filter(a=>a.type==='image').map(a=>a.content.split(',')[1]);
        if (imgs.length) req.images = imgs;

        let prompt = buildContext(msg);
        const txts = state.attachments.filter(a=>a.type==='text');
        if(txts.length) {
            prompt += "\n\n--- FILES ---\n";
            txts.forEach(f=> prompt += `NAME: ${f.name}\nCONTENT:\n${f.content}\n\n`);
            prompt += "--- END FILES ---\nAnalyze the above files.";
        }
        req.prompt = prompt;
        state.attachments = [];
        state.conversationHistory.push({ role: "user", content: displayMsg });

        try {
            const res = await fetch(`${OLLAMA_API}/api/generate`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(req), signal: state.abortController.signal });
            const data = await res.json();
            removeTyping();
            if (data.response) {
                addMessage(data.response.trim(), "bot");
                state.conversationHistory.push({ role: "assistant", content: data.response.trim() });
            } else addMessage("No response.", "bot");
        } catch (e) {
            removeTyping();
            if (e.name !== 'AbortError') addMessage("Error reaching Ollama.", "bot");
        } finally {
            updateButtonState(false); state.abortController = null;
        }
    }

    // ==========================================
    // 9. TRANSLATION (SWITCHED TO GOOGLE TRANSLATE API)
    // ==========================================
    function speakText(t) { if(!t)return; const u=new SpeechSynthesisUtterance(t); u.lang="en-US"; speechSynthesis.cancel(); speechSynthesis.speak(u); }
    
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

    // REPLACED: using Google Translate (GTX) for stability
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
                        
                        // Google returns an array of arrays. e.g. [[["Translated", "Original", ...]]]
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

        const label = document.createElement("label");
        label.className = "gn-translate-label";
        label.textContent = "Translate to:";

        const dropdown = document.createElement("select");
        dropdown.className = "gn-translate-dropdown";
        dropdown.value = currentLang;

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
                if(contentDiv) contentDiv.textContent = originalText;
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

    if (ttsBtn) ttsBtn.addEventListener("click", () => speakText(state.lastBotResponse));
    if (sendBtn) { sendBtn.innerHTML = ICON_SEND; sendBtn.addEventListener("click", handleSendClick); }
    if (input) input.addEventListener("keypress", (e) => { if (e.key === "Enter" && !state.isGenerating) sendMessage(); });
    if (modelSelect) modelSelect.addEventListener("change", (e) => state.selectedModel = e.target.value);

    window.quickPrompt = (prompt) => { input.value = prompt; sendMessage(); };
    window.scrollToChat = () => input.focus();
    fetchModels();
})();