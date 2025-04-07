// --- START OF FILE horoscope.js --- (MODIFIED)

// Nyaa~! Daily Good Vibes Horoscope! What do the stars whisper today~? ✨
// Remember: This is just for fun! Don't take it *too* seriously, okay? ♡
// ** UPDATED with Clearer Date Display & History Fix **

const HoroscopeApp = (() => {
    // --- Settings & Constants ---
    const CACHE_STORAGE_KEY = 'mikaHoroscopeCache_v1';
    const SIGN_STORAGE_KEY = 'mikaHoroscopeUserSign_v1';
    const ZODIAC_SIGNS = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ];
    const MAX_HISTORY_ENTRIES = 30;

    // --- State ---
    let gameUiContainer = null;
    let messageCallback = null;
    let apiCaller = null;
    let currentUserName = "User";
    let currentPersonaInGame = 'Mika';
    let userSign = null;
    let horoscopeCache = {};
    let isGenerating = false;

    // --- DOM Element References ---
    let signSelect = null;
    let horoscopeDisplayArea = null;
    let historyViewArea = null;
    let mainHoroscopeViewArea = null;
    let loadingIndicator = null;
    let mainTitleElement = null; // ** NEW Ref for the main title **

    // --- Helper Functions ---
    function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }
    function _getYesterdayDateString() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); } // Helper retained if needed elsewhere

    // ** MODIFIED: Formatter for general display (uses Today/Yesterday) **
    function _formatDateForDisplay(dateString) {
        if (!dateString) return 'N/A';
        const today = _getCurrentDateString();
        const yesterday = _getYesterdayDateString();
        if (dateString === today) return `Today (${new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
        if (dateString === yesterday) return `Yesterday (${new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
        try {
            const date = new Date(dateString + 'T00:00:00');
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { return 'Invalid Date'; }
    }

    // ** NEW: Specific formatter for history list (no Today/Yesterday shortcuts) **
    function _formatDateForHistoryDisplay(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString + 'T00:00:00');
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            console.error("Error formatting history date:", dateString, e);
            return 'Invalid Date';
        }
    }


    // --- Data Persistence --- (Unchanged)
    function _loadState() { /* ... */ try { userSign = localStorage.getItem(SIGN_STORAGE_KEY); const storedCache = localStorage.getItem(CACHE_STORAGE_KEY); if (storedCache) { horoscopeCache = JSON.parse(storedCache); if (typeof horoscopeCache !== 'object' || horoscopeCache === null) horoscopeCache = {}; _pruneOldCacheEntries(); } else { horoscopeCache = {}; } console.log("Horoscope state loaded. User Sign:", userSign, "Cache size:", Object.keys(horoscopeCache).length); } catch (e) { console.error("Failed to load horoscope state:", e); userSign = null; horoscopeCache = {}; localStorage.removeItem(SIGN_STORAGE_KEY); localStorage.removeItem(CACHE_STORAGE_KEY); } }
    function _saveState() { /* ... */ try { if (userSign) { localStorage.setItem(SIGN_STORAGE_KEY, userSign); } else { localStorage.removeItem(SIGN_STORAGE_KEY); } _pruneOldCacheEntries(); localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(horoscopeCache)); console.log("Horoscope state saved."); } catch (e) { console.error("Failed to save horoscope state:", e); } }
    function _pruneOldCacheEntries() { /* ... */ const entries = Object.entries(horoscopeCache); if (entries.length <= MAX_HISTORY_ENTRIES) return; entries.sort(([, a], [, b]) => a.timestamp - b.timestamp); const entriesToRemove = entries.length - MAX_HISTORY_ENTRIES; for (let i = 0; i < entriesToRemove; i++) { delete horoscopeCache[entries[i][0]]; } console.log(`Pruned ${entriesToRemove} old horoscope cache entries.`); }


    // --- Core Logic --- (Unchanged logic, just UI title update needed)
    function _getCacheKey(date, persona, sign) { return `${date}_${persona}_${sign}`; }

    async function _renderTodayHoroscope() {
        if (!userSign) {
            _displayHoroscope("Please select your Zodiac sign first~", true);
            if(mainTitleElement) mainTitleElement.textContent = `Daily Horoscope ${currentPersonaInGame === 'Mika' ? '☆' : '★'}`; // Reset title if no sign
            return;
        }
        if (isGenerating) return;

        const today = _getCurrentDateString();
        // ** Update the main title with today's date **
        if (mainTitleElement) {
            mainTitleElement.textContent = `Horoscope for ${_formatDateForDisplay(today)}`;
        }

        const cacheKey = _getCacheKey(today, currentPersonaInGame, userSign);
        const cachedEntry = horoscopeCache[cacheKey];

        if (cachedEntry) {
            console.log(`Horoscope found in cache for ${cacheKey}`);
            _displayHoroscope(cachedEntry.text);
        } else {
            console.log(`Horoscope not in cache for ${cacheKey}. Generating...`);
            isGenerating = true;
            _setLoadingState(true);
            _displayHoroscope("");

            try {
                const generatedText = await _generatePersonaHoroscope(userSign);
                if (generatedText) {
                    const newEntry = { timestamp: Date.now(), text: generatedText };
                    horoscopeCache[cacheKey] = newEntry;
                    _saveState();
                    _displayHoroscope(generatedText);
                } else {
                    _displayHoroscope(`${currentPersonaInGame === 'Kana' ? 'Generation failed.' : 'Meeeow! My star-gazing magic fizzled... Couldn\'t generate horoscope.'}`, true);
                }
            } catch (error) {
                console.error("Error generating horoscope:", error);
                _displayHoroscope(`${currentPersonaInGame === 'Kana' ? 'Error contacting API.' : 'Mrow! Couldn\'t reach the stars... Error generating.'}`, true);
            } finally {
                isGenerating = false;
                _setLoadingState(false);
            }
        }
    }

    async function _generatePersonaHoroscope(sign) { /* ... (Unchanged) ... */ if (!apiCaller) { console.error("API Caller not available for horoscope generation."); return null; } const personaPromptPart = (currentPersonaInGame === 'Mika') ? `You are Mika, a bubbly, playful, and encouraging catgirl assistant.` : `You are Kana, a sly, sarcastic, and witty catgirl assistant.`; const vibe = (currentPersonaInGame === 'Mika') ? `Focus on positive possibilities, encouraging thoughts, and maybe a touch of playful teasing. Keep it light and fun!` : `Give a sarcastic or dryly witty take on the day, maybe finding a cynical silver lining or offering begrudging advice. Keep it sharp and concise.`; const prompt = `${personaPromptPart} Generate a short, fun, daily 'good vibes' style horoscope for ${currentUserName}, whose sign is ${sign}. ${vibe} Address ${currentUserName} directly. Keep it to 1-2 short paragraphs max. Just output the horoscope text.`; try { const response = await callMikaApiForApp(prompt); return response; } catch (error) { return null; } }
    function _displayHoroscope(text, isError = false) { /* ... (Unchanged) ... */ if (horoscopeDisplayArea) { if (isError) { horoscopeDisplayArea.innerHTML = `<p style="color: var(--error-color); font-style: italic;">${sanitizeHTML(text)}</p>`; } else if (text) { let processedText = sanitizeHTML(text) .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') .replace(/\*(.*?)\*/g, '<em>$1</em>') .replace(/(?<!<br>)\n/g, '<br>'); horoscopeDisplayArea.innerHTML = `<p>${processedText}</p>`; } else { horoscopeDisplayArea.innerHTML = ''; } } }
    function _setLoadingState(isLoading) { /* ... (Unchanged) ... */ if (loadingIndicator) { loadingIndicator.style.display = isLoading ? 'block' : 'none'; loadingIndicator.textContent = isLoading ? (currentPersonaInGame === 'Kana' ? 'Consulting the void...' : 'Gazing at the stars... ✨') : ''; } if (signSelect) signSelect.disabled = isLoading; const historyButton = mainHoroscopeViewArea?.querySelector('#horoscope-history-button'); if (historyButton) historyButton.disabled = isLoading; }


    // --- UI Rendering ---

    function _clearUI() { /* ... (clear new mainTitleElement too) ... */ if (gameUiContainer) gameUiContainer.innerHTML = ''; signSelect = horoscopeDisplayArea = historyViewArea = mainHoroscopeViewArea = loadingIndicator = mainTitleElement = null; }

    function _createMainUI() {
        _clearUI();
        if (!gameUiContainer) return;
        currentView = 'main';

        mainHoroscopeViewArea = document.createElement('div');
        mainHoroscopeViewArea.id = 'horoscope-main-view';
        mainHoroscopeViewArea.style.cssText = `width: 100%; height: 100%; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box;`;

        // --- Title (Now assigned to mainTitleElement) ---
        mainTitleElement = document.createElement('h3');
        mainTitleElement.textContent = `Daily Horoscope ${currentPersonaInGame === 'Mika' ? '☆' : '★'}`; // Placeholder
        mainTitleElement.style.textAlign = 'center';
        mainTitleElement.style.color = 'var(--chat-header-text)';
        mainTitleElement.style.marginBottom = '15px';
        mainHoroscopeViewArea.appendChild(mainTitleElement);

        // --- Sign Selection --- (Unchanged structure)
        const selectArea = document.createElement('div'); /* ... */ selectArea.style.textAlign = 'center'; selectArea.style.marginBottom = '15px'; const label = document.createElement('label'); label.htmlFor = 'horoscope-sign-select'; label.textContent = 'Select Your Sign: '; label.style.marginRight = '5px'; label.style.color = 'var(--chat-text)'; signSelect = document.createElement('select'); signSelect.id = 'horoscope-sign-select'; signSelect.style.padding = '5px'; signSelect.style.borderRadius = '4px'; signSelect.style.backgroundColor = 'var(--input-bg)'; signSelect.style.color = 'var(--text-color)'; signSelect.style.border = '1px solid var(--input-border)'; const placeholderOption = document.createElement('option'); placeholderOption.value = ""; placeholderOption.textContent = "-- Select --"; placeholderOption.disabled = true; placeholderOption.selected = !userSign; signSelect.appendChild(placeholderOption); ZODIAC_SIGNS.forEach(sign => { const option = document.createElement('option'); option.value = sign; option.textContent = sign; if (sign === userSign) { option.selected = true; } signSelect.appendChild(option); }); signSelect.onchange = _handleSignChange; selectArea.appendChild(label); selectArea.appendChild(signSelect); mainHoroscopeViewArea.appendChild(selectArea);

        // --- Loading Indicator --- (Unchanged structure)
        loadingIndicator = document.createElement('div'); /* ... */ loadingIndicator.id = 'horoscope-loading'; loadingIndicator.style.cssText = `text-align: center; font-style: italic; color: var(--typing-indicator-text); margin-bottom: 10px; display: none; min-height: 1.2em;`; mainHoroscopeViewArea.appendChild(loadingIndicator);

        // --- Horoscope Display Area --- (Unchanged structure)
        horoscopeDisplayArea = document.createElement('div'); /* ... */ horoscopeDisplayArea.id = 'horoscope-display'; horoscopeDisplayArea.style.cssText = `flex-grow: 1; overflow-y: auto; border: 1px solid var(--input-border); border-radius: 5px; padding: 15px; margin-bottom: 10px; background-color: rgba(0,0,0, 0.1); min-height: 100px; color: var(--chat-log-text);`; mainHoroscopeViewArea.appendChild(horoscopeDisplayArea);

        // --- Buttons --- (Unchanged structure)
        const buttonArea = document.createElement('div'); /* ... */ buttonArea.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-shrink: 0;`; const historyButton = document.createElement('button'); historyButton.id = 'horoscope-history-button'; historyButton.textContent = 'View History 📜'; historyButton.className = 'rps-choice-button secondary'; historyButton.onclick = _createHistoryUI; buttonArea.appendChild(historyButton); const backButton = document.createElement('button'); backButton.id = 'back-to-chat-button'; backButton.textContent = 'Back to Chat'; backButton.className = 'rps-choice-button secondary'; /* Added class */ backButton.onclick = () => { if (typeof switchToChatView === 'function') switchToChatView(); else console.error("Cannot find switchToChatView function!"); }; buttonArea.appendChild(backButton); mainHoroscopeViewArea.appendChild(buttonArea);

        gameUiContainer.appendChild(mainHoroscopeViewArea);

        // Fetch horoscope if sign is selected (this will also update the title)
        if (userSign) {
            _renderTodayHoroscope();
        } else {
            _displayHoroscope("Please select your Zodiac sign above~", true);
            // Set initial title if no sign
            if(mainTitleElement) mainTitleElement.textContent = `Daily Horoscope ${currentPersonaInGame === 'Mika' ? '☆' : '★'}`;
        }
    }

    function _createHistoryUI() { /* ... (Unchanged structure) ... */ _clearUI(); if (!gameUiContainer) return; currentView = 'history'; historyViewArea = document.createElement('div'); historyViewArea.id = 'horoscope-history-view'; historyViewArea.style.cssText = `width: 100%; height: 100%; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box;`; const title = document.createElement('h3'); title.textContent = 'Horoscope History'; title.style.textAlign = 'center'; title.style.color = 'var(--chat-header-text)'; title.style.marginBottom = '10px'; historyViewArea.appendChild(title); const backButton = document.createElement('button'); backButton.textContent = '← Back to Today'; backButton.className = 'rps-choice-button secondary'; backButton.style.alignSelf = 'center'; backButton.style.marginBottom = '10px'; backButton.onclick = _createMainUI; historyViewArea.appendChild(backButton); const listContainer = document.createElement('div'); listContainer.id = 'horoscope-history-list'; listContainer.style.cssText = `flex-grow: 1; overflow-y: auto; border: 1px solid var(--input-border); border-radius: 5px; padding: 10px; background-color: rgba(0,0,0,0.1);`; historyViewArea.appendChild(listContainer); gameUiContainer.appendChild(historyViewArea); _renderHistoryList(listContainer); } // Render list called here

    // ** MODIFIED: Use specific history date formatter **
    function _renderHistoryList(container) {
        if (!container) return;
        container.innerHTML = '';

        const entries = Object.entries(horoscopeCache);
        if (entries.length === 0) {
            container.innerHTML = '<p style="text-align: center; font-style: italic; color: var(--system-message-text);">No history recorded yet.</p>';
            return;
        }

        entries.sort(([, a], [, b]) => b.timestamp - a.timestamp);

        entries.forEach(([key, entry]) => {
            const [date, persona, sign] = key.split('_');
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = `margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed var(--input-border);`;

            const header = document.createElement('div');
            header.style.cssText = `font-size: 0.8em; color: var(--system-message-text); margin-bottom: 3px; display: flex; justify-content: space-between;`;
            const headerInfo = document.createElement('span');
            headerInfo.textContent = `${sign} - by ${persona}`;
            const headerDate = document.createElement('span');
            // ** USE _formatDateForHistoryDisplay HERE **
            headerDate.textContent = _formatDateForHistoryDisplay(date);
            header.appendChild(headerInfo);
            header.appendChild(headerDate);

            const textP = document.createElement('p'); /* ... (text formatting unchanged) ... */ textP.style.cssText = `font-size: 0.95em; margin: 0; color: var(--chat-log-text);`; let processedText = sanitizeHTML(entry.text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/(?<!<br>)\n/g, '<br>'); textP.innerHTML = processedText;

            itemDiv.appendChild(header);
            itemDiv.appendChild(textP);
            container.appendChild(itemDiv);
        });
    }


    // --- Event Handlers --- (Unchanged)
    function _handleSignChange(event) { /* ... */ const newSign = event.target.value; if (newSign && ZODIAC_SIGNS.includes(newSign)) { userSign = newSign; _saveState(); _renderTodayHoroscope(); } }


    // --- Initialization and Exit --- (Unchanged)
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) { /* ... */ console.log("Initializing Horoscope App..."); gameUiContainer = _gameUiContainer; messageCallback = _messageCallback; apiCaller = _apiCaller; currentUserName = userName || "User"; currentPersonaInGame = persona || 'Mika'; isGenerating = false; if (!gameUiContainer) { console.error("Horoscope App UI container not provided!"); if(messageCallback) messageCallback('System', 'Error: Horoscope UI container missing!'); return; } _loadState(); _createMainUI(); console.log(`Horoscope App initialized for ${currentUserName} with ${currentPersonaInGame}.`); }
    function onExit() { /* ... */ console.log("HoroscopeApp onExit called."); isGenerating = false; return Promise.resolve(true); }


    // --- Public Interface ---
    return {
        init: init,
        onExit: onExit
    };

})();

// --- END OF FILE horoscope.js --- (MODIFIED)