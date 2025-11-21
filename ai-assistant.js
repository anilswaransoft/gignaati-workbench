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
            // Styling handled in CSS, simplified here
            let icon = att.type === 'image' ? `<img src="${att.content}" class="gn-file-thumb" style="height:20px; border-radius:4px;" />` : "📄";
            card.innerHTML = `${icon}<span style="margin-left:5px">${att.name.substring(0,10)}...</span><span class="gn-remove-file" data-idx="${i}">×</span>`;
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
            // Change button color: Red for stop, Black (default) for send
            sendBtn.style.backgroundColor = gen ? "#dc3545" : "#000";
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
            } else {
                if(modelSelect) modelSelect.innerHTML = "<option>No models found</option>";
            }
        } catch (e) {
            if(modelSelect) modelSelect.innerHTML = "<option>Offline</option>";
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
            if (e.name !== 'AbortError') addMessage("Error reaching Ollama. Is it running?", "bot");
        } finally {
            updateButtonState(false); state.abortController = null;
        }
    }

    // ==========================================
    // 9. TRANSLATION (Google Translate Logic)
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
    
    // Global function for quick actions
    window.quickPrompt = (prompt) => { 
        activateChatUI(); // Ensure UI switches even on quick prompt
        input.value = prompt; 
        sendMessage(); 
    };
    window.scrollToChat = () => { if(input) input.focus(); };
    //window.openExternalLink = (url) => window.open(url, '_blank');

    if (ttsBtn) ttsBtn.addEventListener("click", () => speakText(state.lastBotResponse));
    if (sendBtn) { sendBtn.addEventListener("click", handleSendClick); }
    if (input) input.addEventListener("keypress", (e) => { if (e.key === "Enter" && !state.isGenerating) sendMessage(); });
    if (modelSelect) modelSelect.addEventListener("change", (e) => state.selectedModel = e.target.value);

    fetchModels();
})();