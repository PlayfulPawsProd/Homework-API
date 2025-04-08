// --- START OF FILE comicstrip.js --- (REVISING PROMPT FOR MORE CONTEXT/HUMOR - V11)

// Nyaa~! (Potentially) Unlimited Comic Strips! Starring ME (Mika) and... Kana. (=^･ω･^=)
// ** Now with Dynamic Theme Refreshing via AI! **

const ComicStripApp = (() => {
    // --- Settings & Constants ---
    const STORAGE_KEY_COMICS = 'mikaComicCacheV2'; // Cache for generated comics
    const THEME_STORAGE_KEY = 'mikaComicThemes_v1'; // Storage for the current theme list
    const COUNT_STORAGE_KEY = 'mikaComicGenCount_v1'; // Storage for generation count
    const THEME_REFRESH_THRESHOLD = 50; // Generate new themes after this many comics
    const MAX_HISTORY_ENTRIES = 50; // Limit total *number* of comics stored
    const THEMES_TO_REQUEST = 40; // How many new themes to ask the AI for

    // --- Default Theme List (Fallback & Initial Seed) ---
    const DEFAULT_RANDOM_THEMES = [
        "Trying to build a pillow fort", "Finding a mysterious button", "Reacting to a weird noise off-panel",
        "Mika 'decorating' something inappropriately", "Kana trying to read with Mika nearby", "A malfunctioning gadget",
        "An unexpected visitor (goofy bird)", "Trying to share a tiny space", "Mika imitating Kana (poorly)",
        "Discovering static electricity", "A failed attempt at cooking", "Trying to assemble confusing instructions",
        "Mika finds a laser pointer dot", "Kana encounters an overly friendly dust bunny", "Trying to water a fake plant",
        "Mika tries to 'fix' something not broken", "Interacting with a mirror", "A sudden unexplained craving (Lasagna?)",
        "Mika gets tangled in yarn", "Trying to understand a complex board game", "Trying to use a vacuum cleaner",
        "A sudden power outage", "Mika finding a 'treasure' (bottle cap)", "Kana trying to ignore a ringing phone",
        "Mika wearing a funny hat", "Trying to catch raindrops", "Reacting to their reflection unexpectedly",
        "A very loud obnoxious bird", "Mika trying to 'share' food", "Finding a single unexplained balloon",
        "Kana getting stuck somewhere comfy", "Mika attempting dramatic poses", "Trying to open a stubborn jar",
        "Kana judging Mika's 'art'", "A mysterious puddle appears indoors", "Mika gets hiccups",
        "Trying to follow an exercise video", "Kana's nap spot is occupied", "Mika reading a book upside down",
        "Argument over the TV remote", "Mika brings Kana a 'gift' (leaf)", "Kana dealing with a fly",
        "Trying to balance something", "Mika gets stuck", "Reacting to sudden loud music", "Kana trying to hide",
        "Mika discovers shadows", "Trying to use chopsticks (badly)", "A messy crafting attempt",
        "Kana tries to steal a blanket", "Mika 'talking' to houseplants", "Encounter with a Roomba",
        "Trying to fold a fitted sheet", "Mika wearing too many accessories", "Kana witnesses Mika talking to herself",
        "Dramatic reaction to a spider", "Trying to untangle fairy lights", "Mika attempts a magic trick",
        "Kana tries to reach something high", "Finding a lost toy", "Mika trying to 'help' groom",
        "Reacting to sudden temperature change", "Kana unimpressed by Mika's hiding spot", "Mika discovers her own tail",
        "Trying to fit into something too small", "Staring contest with inanimate object"
    ];

    // --- State ---
    let gameUiContainer = null;
    let messageCallback = null;
    let apiCaller = null;
    let currentUserName = "User";
    let currentPersonaInGame = 'Mika'; // Persona active WHEN GENERATING
    let comicCache = {};
    let isGenerating = false; // Covers both comic and theme generation
    let currentView = 'main';
    let currentThemes = [...DEFAULT_RANDOM_THEMES]; // Holds the active theme list
    let generationCount = 0; // Tracks comics generated since last theme refresh

    // --- DOM Element References --- (unchanged)
    let mainComicView = null; let comicDisplayArea = null; let fetchButton = null;
    let historyButton = null; let loadingIndicator = null; let historyView = null;
    let historyList = null; let backToChatButton = null;

    // --- Helper Functions --- (unchanged)
    function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }
    function _formatDateTimeForHistory(timestamp) { if (!timestamp) return 'N/A'; try { return new Date(timestamp).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { console.error("Error formatting history date/time:", timestamp, e); return 'Invalid Date'; } }
    function _formatDateForDisplay(dateString) { if (!dateString) return 'N/A'; const today = _getCurrentDateString(); const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); const yesterdayStr = yesterday.toISOString().slice(0, 10); if (dateString === today) return 'Today'; if (dateString === yesterdayStr) return 'Yesterday'; try { const date = new Date(dateString + 'T00:00:00'); return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return 'Invalid Date'; } }
    function _sanitizeHTML(str) { if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) { return DOMPurify.sanitize(str, { USE_PROFILES: { html: true }, ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] }); } console.warn("DOMPurify missing in ComicStrip, basic fallback."); return str.replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    // --- Theme & Count Persistence ---
    function _loadGenerationCount() {
        const storedCount = localStorage.getItem(COUNT_STORAGE_KEY);
        generationCount = storedCount ? parseInt(storedCount, 10) : 0;
        if (isNaN(generationCount)) generationCount = 0;
        console.log(`Loaded comic generation count: ${generationCount}`);
    }
    function _saveGenerationCount() {
        localStorage.setItem(COUNT_STORAGE_KEY, generationCount.toString());
    }
    function _loadThemes() {
        try {
            const storedThemes = localStorage.getItem(THEME_STORAGE_KEY);
            if (storedThemes) {
                const parsedThemes = JSON.parse(storedThemes);
                // Basic validation: is it an array of strings?
                if (Array.isArray(parsedThemes) && parsedThemes.length > 5 && parsedThemes.every(item => typeof item === 'string')) {
                    currentThemes = parsedThemes;
                    console.log(`Loaded ${currentThemes.length} themes from local storage.`);
                    return; // Success
                } else {
                    console.warn("Invalid theme data found in local storage, using defaults.");
                }
            } else {
                console.log("No themes found in local storage, using defaults.");
            }
        } catch (e) {
            console.error("Failed to load themes from local storage, using defaults:", e);
        }
        // Fallback to default if loading failed or no stored data
        currentThemes = [...DEFAULT_RANDOM_THEMES];
        _saveThemes(); // Save defaults if none were loaded
    }
    function _saveThemes() {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(currentThemes));
            console.log(`Saved ${currentThemes.length} themes to local storage.`);
        } catch (e) {
            console.error("Failed to save themes:", e);
        }
    }

    // --- Comic Cache Handling --- (unchanged from v10)
    function _loadCache() { /* ... */ try { const stored = localStorage.getItem(STORAGE_KEY_COMICS); if (stored) { comicCache = JSON.parse(stored); if (typeof comicCache !== 'object' || comicCache === null) comicCache = {}; const validatedCache = {}; Object.entries(comicCache).forEach(([key, value]) => { if (!isNaN(Number(key)) && value && value.panels && value.timestamp && value.personaGeneratedWith) { validatedCache[key] = value; } else { console.warn(`Skipping invalid comic cache entry for key: ${key}`); } }); comicCache = validatedCache; console.log(`Loaded ${Object.keys(comicCache).length} cached comics (v2).`); } else { comicCache = {}; console.log("No comic cache (v2) found."); } } catch (e) { console.error("Failed to load comic cache (v2):", e); comicCache = {}; localStorage.removeItem(STORAGE_KEY_COMICS); } }
    function _saveCache() { /* ... */ try { _pruneCache(); localStorage.setItem(STORAGE_KEY_COMICS, JSON.stringify(comicCache)); console.log(`Saved ${Object.keys(comicCache).length} comics to cache (v2).`); } catch (e) { console.error("Failed to save comic cache (v2):", e); } }
    function _pruneCache() { /* ... */ const entries = Object.entries(comicCache); if (entries.length <= MAX_HISTORY_ENTRIES) return; entries.sort(([keyA], [keyB]) => Number(keyA) - Number(keyB)); const entriesToRemove = entries.length - MAX_HISTORY_ENTRIES; for (let i = 0; i < entriesToRemove; i++) { delete comicCache[entries[i][0]]; } console.log(`Pruned ${entriesToRemove} old comic cache entries.`); }

    // --- UI Rendering --- (unchanged from v10)
    function _clearUI() { /* ... */ if (gameUiContainer) gameUiContainer.innerHTML = ''; mainComicView = comicDisplayArea = fetchButton = historyButton = loadingIndicator = historyView = historyList = backToChatButton = null; isGenerating = false; }
    function _createMainUI() { /* ... */ _clearUI(); currentView = 'main'; mainComicView = document.createElement('div'); mainComicView.id = 'comic-main-view'; mainComicView.style.cssText = `width: 100%; height: 100%; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box;`; const controlsArea = document.createElement('div'); controlsArea.id = 'comic-controls'; controlsArea.style.textAlign = 'center'; fetchButton = document.createElement('button'); fetchButton.id = 'fetch-comic-button'; fetchButton.textContent = "Get Comic!"; fetchButton.className = 'rps-choice-button'; fetchButton.onclick = _handleFetchComic; historyButton = document.createElement('button'); historyButton.id = 'comic-history-button'; historyButton.textContent = 'View History 📜'; historyButton.className = 'rps-choice-button secondary'; historyButton.onclick = _createHistoryUI; controlsArea.appendChild(fetchButton); controlsArea.appendChild(historyButton); mainComicView.appendChild(controlsArea); loadingIndicator = document.createElement('div'); loadingIndicator.id = 'comic-loading'; loadingIndicator.style.display = 'none'; loadingIndicator.style.textAlign = 'center'; mainComicView.appendChild(loadingIndicator); comicDisplayArea = document.createElement('div'); comicDisplayArea.id = 'comic-display-area'; mainComicView.appendChild(comicDisplayArea); _displayComic(null); backToChatButton = document.createElement('button'); backToChatButton.id = 'back-to-chat-button'; backToChatButton.textContent = 'Back to Chat'; backToChatButton.className = 'rps-choice-button secondary'; backToChatButton.style.marginTop = 'auto'; backToChatButton.style.alignSelf = 'center'; backToChatButton.onclick = () => { if (typeof switchToChatView === 'function') switchToChatView(); }; mainComicView.appendChild(backToChatButton); gameUiContainer.appendChild(mainComicView); }
    function _createHistoryUI() { /* ... */ _clearUI(); currentView = 'history'; historyView = document.createElement('div'); historyView.id = 'comic-history-view'; historyView.className = 'library-view'; const title = document.createElement('h3'); title.textContent = 'Comic History'; title.className = 'library-title'; historyView.appendChild(title); const backButton = document.createElement('button'); backButton.textContent = '← Back to Comic Generator'; backButton.className = 'rps-choice-button secondary library-back-button'; backButton.onclick = _createMainUI; historyView.appendChild(backButton); historyList = document.createElement('div'); historyList.id = 'comic-history-list'; historyView.appendChild(historyList); _renderHistoryList(historyList); gameUiContainer.appendChild(historyView); }
    function _renderHistoryList(container) { /* ... */ if (!container) return; container.innerHTML = ''; const timestamps = Object.keys(comicCache).map(Number).sort((a, b) => b - a); if (timestamps.length === 0) { container.innerHTML = '<p style="text-align: center; font-style: italic; color: var(--system-message-text);">No comics saved yet!</p>'; return; } timestamps.forEach(tsKey => { const comicData = comicCache[tsKey]; if (!comicData || !comicData.panels || !comicData.timestamp || !comicData.personaGeneratedWith) { console.warn(`Skipping malformed history entry for timestamp: ${tsKey}`); return; } const itemDiv = document.createElement('div'); itemDiv.className = 'comic-history-item'; itemDiv.onclick = () => _loadSpecificComic(tsKey); const dateTimeSpan = document.createElement('span'); dateTimeSpan.textContent = _formatDateTimeForHistory(tsKey); const personaSpan = document.createElement('span'); personaSpan.textContent = `Inspired by: ${comicData.personaGeneratedWith}`; itemDiv.appendChild(dateTimeSpan); itemDiv.appendChild(personaSpan); container.appendChild(itemDiv); }); }
    function _loadSpecificComic(timestampKey) { /* ... */ const comicData = comicCache[timestampKey]; if (!comicData) { console.error("Could not find comic for timestamp:", timestampKey); _showError("Couldn't load that comic!"); return; } _createMainUI(); _displayComic(comicData); if (fetchButton) { fetchButton.textContent = "Get Another Comic!"; fetchButton.disabled = false; } }
    function _displayComic(comicData) { /* ... */ if (!comicDisplayArea) return; comicDisplayArea.innerHTML = ''; if (!comicData || !Array.isArray(comicData.panels) || comicData.panels.length !== 3) { comicDisplayArea.style.display = 'block'; comicDisplayArea.style.textAlign = 'center'; comicDisplayArea.style.paddingTop = '30px'; comicDisplayArea.innerHTML = `<p style="color: var(--system-message-text); font-style: italic;">Click "Get Comic!" to see the daily strip! Nyaa~!</p>`; if (fetchButton) fetchButton.textContent = "Get Comic!"; return; } comicDisplayArea.style.display = 'flex'; comicDisplayArea.style.textAlign = 'left'; comicDisplayArea.style.paddingTop = '0'; if (fetchButton) fetchButton.textContent = "Get Another Comic!"; comicData.panels.forEach((panel, index) => { const panelDiv = document.createElement('div'); panelDiv.className = 'comic-panel'; const asciiArt = document.createElement('pre'); const safeAscii = (panel.ascii || '').replace(/<script.*?>.*?<\/script>/gi, ''); asciiArt.textContent = safeAscii || '(No Art)'; panelDiv.appendChild(asciiArt); const text = document.createElement('p'); text.innerHTML = _sanitizeHTML(panel.text || '(No Text)'); panelDiv.appendChild(text); comicDisplayArea.appendChild(panelDiv); }); }
    function _setLoadingState(isLoading, message = null) { /* ... updated slightly for theme gen message */ isGenerating = isLoading; if (loadingIndicator) { let loadingText = ''; if (isLoading) { loadingText = message || (currentPersonaInGame === 'Kana' ? '*Sigh*... Drawing.' : 'Drawing furiously~! ♡'); } loadingIndicator.textContent = loadingText; loadingIndicator.style.display = isLoading ? 'block' : 'none'; loadingIndicator.style.color = 'var(--typing-indicator-text)'; } if (fetchButton) fetchButton.disabled = isLoading; if (historyButton) historyButton.disabled = isLoading; if (backToChatButton) backToChatButton.disabled = isLoading; }
    function _showError(message) { /* ... */ if (loadingIndicator) { loadingIndicator.textContent = `Error: ${message}`; loadingIndicator.style.color = 'var(--error-color)'; loadingIndicator.style.display = 'block'; setTimeout(() => { if (loadingIndicator && loadingIndicator.textContent.startsWith("Error:")) { loadingIndicator.textContent = ''; loadingIndicator.style.display = 'none'; loadingIndicator.style.color = 'var(--typing-indicator-text)'; } }, 3000); } }

    // --- NEW Theme Generation Function ---
    async function _generateNewThemes() {
        console.log("Attempting to generate new themes...");
        _setLoadingState(true, "Refreshing theme ideas... ✨"); // Specific loading message

        if (!apiCaller) {
            _showError("API caller missing, cannot generate themes.");
            _setLoadingState(false);
            return false;
        }

        // Create a snippet of current themes for context
        const themeExamples = currentThemes.slice(0, 15).map(t => `- ${t}`).join('\n'); // Show a sample

        const themePrompt = `[ROLE: You are a creative idea generator for funny comic strips.]

**Goal:** Generate a list of ${THEMES_TO_REQUEST} **NEW and VARIED** themes for 3-panel comic strips.

**Characters:** The comics feature Mika (hyperactive, naive catgirl, like Odie) and Kana (sarcastic, deadpan catgirl, like Garfield). Themes should allow for humor based on their contrasting personalities.

**Requirements for Themes:**
*   **Simple & Concrete:** Ideas should be simple situations or objects (e.g., "Trying to use a gadget", "Finding a weird object", "Reacting to a noise").
*   **Variety:** Generate a WIDE RANGE of different ideas. Avoid repetition.
*   **Funny Potential:** Themes should lend themselves to silly, absurd, or witty interactions between Mika and Kana.
*   **New Ideas:** Themes should be DIFFERENT from the following examples (which are the current list):
${themeExamples}
*   **Avoid Forbidden:** Do NOT include themes about: Clouds, socks, butterflies, weather, staring contests, boxes, naps, generic cuteness/boredom.

**Output Format:** Provide the themes as a plain numbered list, one theme per line. ONLY output the list. Example:
1. Theme idea one
2. Theme idea two
3. Theme idea three
... up to ${THEMES_TO_REQUEST}.`;

        try {
            const response = await callMikaApiForApp(themePrompt);
            if (!response) {
                 throw new Error("API returned empty response for themes.");
            }

            // Parse the response into a list of themes
            const lines = response.split('\n');
            const newThemes = lines
                .map(line => line.replace(/^\d+\.\s*/, '').trim()) // Remove numbering/bullets
                .filter(line => line.length > 3 && line.length < 100); // Basic validation

            if (newThemes.length >= THEMES_TO_REQUEST / 2) { // Check if we got a decent number back
                console.log(`Successfully generated ${newThemes.length} new themes.`);
                currentThemes = newThemes; // Update the current themes
                _saveThemes(); // Save the new list
                generationCount = 0; // Reset the counter
                _saveGenerationCount();
                if(messageCallback) messageCallback('System', `Nyaa~! ${currentPersonaInGame} refreshed the comic ideas!`); // Inform user via main chat
                 _setLoadingState(false);
                return true; // Success
            } else {
                console.warn(`Generated theme list was too short or invalid. Found ${newThemes.length}. Raw:`, response);
                throw new Error(`Generated insufficient valid themes (${newThemes.length}).`);
            }
        } catch (error) {
            console.error("Failed to generate or parse new themes:", error);
            _showError("Couldn't refresh themes... using old ones.");
             _setLoadingState(false);
            return false; // Indicate failure
        }
    }


    // --- Comic Fetching/Generation ---
    async function _handleFetchComic() {
        if (isGenerating || !apiCaller) return;

        _setLoadingState(true); // Initial loading state for comic fetch
        _displayComic(null); // Clear display

        // *** Check and Trigger Theme Refresh ***
        if (generationCount >= THEME_REFRESH_THRESHOLD) {
             console.log(`Generation count ${generationCount} reached threshold ${THEME_REFRESH_THRESHOLD}. Attempting theme refresh...`);
             const refreshSuccess = await _generateNewThemes();
             if (!refreshSuccess) {
                 // Theme refresh failed, stop loading and maybe show error briefly, user can try again
                 // Error shown by _generateNewThemes
                 _setLoadingState(false); // Stop loading indicator
                 return; // Don't proceed to comic generation if theme refresh failed
             }
             // If successful, _generateNewThemes resets the counter and saves themes. Loading state is handled within.
             // We need to ensure loading state is off *before* proceeding IF refresh was successful
             _setLoadingState(false); // Turn off "Refreshing themes" message
             await new Promise(resolve => setTimeout(resolve, 100)); // Tiny pause before "Drawing" message
             _setLoadingState(true); // Set loading state *again* for the comic drawing phase
        }

        // *** Select Random Theme from the CURRENT list ***
        if (currentThemes.length === 0) { // Safety check if themes somehow became empty
            console.error("Theme list is empty! Using fallback default.");
            currentThemes = [...DEFAULT_RANDOM_THEMES];
        }
        const selectedTheme = currentThemes[Math.floor(Math.random() * currentThemes.length)];
        console.log("Selected Random Theme:", selectedTheme);

        const focusPersona = currentPersonaInGame;
        const promptFocus = focusPersona === 'Kana' ? "Make Kana the slight focus, often delivering the deadpan punchline or sarcastic observation." : "Make Mika the slight focus, often initiating the silly action or having an overly enthusiastic reaction.";

        // ** PROMPT (v10 structure, but uses selectedTheme) **
        const prompt = `[ROLE: You are an AI specializing in writing **genuinely funny and absurd 3-panel comic strips**!]

**Objective:** Create a hilarious comic strip featuring ONLY Mika and Kana based on the provided random theme. The user is NEVER mentioned or involved.

**Characters & Dynamic (VERY IMPORTANT):**
*   Mika: Extremely bubbly, energetic, naive, positive catgirl. Like **Odie** from Garfield - endlessly enthusiastic, maybe slightly annoying/clueless. Pink/light theme.
*   Kana: Extremely sarcastic, deadpan, easily annoyed, intelligent catgirl. Like **Garfield** - cynical, possibly lazy or food-focused, finds Mika's energy exhausting. Purple/dark theme.
*   **Key Dynamic:** Their **Garfield/Odie contrast** is the primary source of humor. Exploit this dynamic!

**Specific Scenario for THIS Comic:** Generate the comic based **specifically** on the following random theme: **"${selectedTheme}"**. Interpret this theme creatively within the Mika(Odie)/Kana(Garfield) dynamic.

**Task:**
Generate a **SHORT, 3-PANEL comic strip** using the theme "${selectedTheme}" with a clear **SETUP** in panels 1 & 2 and a **PUNCHLINE/FUNNY TWIST** in panel 3.

**Requirements:**
1.  **HUMOR & PUNCHLINE:** Priority is **HUMOR**. Panel 3 **MUST** deliver a related PUNCHLINE (often Kana's reaction/comment) or comedic twist following the setup based on the theme "${selectedTheme}". **Avoid flat, nonsensical, or unrelated endings.**
2.  **ADHERE TO THEME:** The comic MUST directly relate to and explore the provided theme: **"${selectedTheme}"**.
3.  **VARIETY (Mental Note):** Although a theme is provided, aim for creative interpretations each time. The goal is maximum variety over many comics.
4.  **Character Contrast:** Explicitly use the Mika(Odie)/Kana(Garfield) dynamic within the theme "${selectedTheme}". Kana often gets the punchline via a deadpan reaction or comment.
5.  **Persona Focus:** Remember ${promptFocus}. If only one character is shown, they act according to their personality and the theme.
6.  **Strict Format:** Provide SIMPLE ASCII art (~5-8 lines high, ~10-15 chars wide, basic characters only: o ^ w T - | / \\ < > @ * . , ' _ ~ $ ! ?) AND concise text (1-2 short lines/phrases) for **EACH** of the 3 panels. Adhere EXACTLY to this format:

PANEL 1 ASCII:
[ASCII ART HERE]

PANEL 1 TEXT:
[Dialogue/Text Here]

PANEL 2 ASCII:
[ASCII ART HERE]

PANEL 2 TEXT:
[Dialogue/Text Here]

PANEL 3 ASCII:
[ASCII ART HERE]

PANEL 3 TEXT:
[Dialogue/Text Here]

**Final Check:** Is Panel 3 a genuinely funny/absurd resolution to the setup based on the theme "${selectedTheme}"? Does it fit the Mika(Odie)/Kana(Garfield) dynamic? Great! Generate!`;
        // ** END PROMPT **

        try {
            const responseText = await callMikaApiForApp(prompt);
            if (!responseText) throw new Error("API returned empty response.");

            const parsedComic = _parseComicResponse(responseText);

            if (parsedComic && parsedComic.length === 3) {
                const comicTimestamp = Date.now();
                const newComicData = {
                    timestamp: comicTimestamp,
                    personaGeneratedWith: focusPersona,
                    panels: parsedComic
                    // theme: selectedTheme // Optionally store the theme used
                };
                comicCache[comicTimestamp] = newComicData;
                _saveCache();
                _displayComic(newComicData);

                // *** Increment Generation Count ***
                generationCount++;
                _saveGenerationCount();
                console.log(`Comic generated successfully. Count is now: ${generationCount}`);

            } else {
                 console.error("Failed to parse comic response:", responseText);
                 _displayComic([{ascii: "Parse Error", text: "Could not understand the comic format."},{ascii: ":(", text: responseText.substring(0, 200)},{ascii: "???", text:"Check console (F12) for raw response."}]);
                throw new Error("Failed to parse comic structure from API response.");
            }

        } catch (error) {
            console.error("Error fetching or parsing comic:", error);
            _showError(currentPersonaInGame === 'Kana' ? "Failed to get comic. Try again." : "Mrow! Couldn't get the comic... try again?");
             _displayComic(null); // Clear panels on error
        } finally {
            _setLoadingState(false); // Turn off "Drawing" message
        }
    }

    // --- Parsing Logic --- (unchanged from v10)
    function _parseComicResponse(responseText) { /* ... */ const panels = []; const panelRegex = /PANEL\s+(\d)\s+ASCII:\s*\n?([\s\S]*?)\n?PANEL\s+\1\s+TEXT:\s*\n?([\s\S]*?)(?=\n?PANEL\s+\d\s+ASCII:|\s*$)/gi; let match; while ((match = panelRegex.exec(responseText)) !== null) { const panelNum = parseInt(match[1], 10); const asciiArt = match[2].trim(); const text = match[3].trim(); if (panelNum >= 1 && panelNum <= 3) { while (panels.length < panelNum) { panels.push(undefined); } if (!panels[panelNum - 1]) { panels[panelNum - 1] = { ascii: asciiArt, text: text }; } } } if (panels.length === 3 && panels.every(p => p !== undefined && p !== null)) { panels.forEach(p => { if (p.ascii) { p.ascii = p.ascii.replace(/^\s*\n|\n\s*$/g, ''); } p.text = p.text || ""; }); return panels; } else { console.warn("Failed to parse exactly 3 panels using primary regex. Found:", panels.length, panels); const lines = responseText.split('\n'); let simplePanels = []; let currentAscii = ""; let currentText = ""; let panelCount = 0; let foundTextForPanel = false; for(let i = 0; i < lines.length; i++) { const line = lines[i].trim(); if(line.length === 0) continue; if (!foundTextForPanel && (line.length > 0 && line.length < 25 && !/[a-zA-Z]{3,}/.test(line))) { currentAscii += line + '\n'; } else { currentText += line + ' '; foundTextForPanel = true; } const nextLine = lines[i+1]?.trim(); if(foundTextForPanel && (nextLine === undefined || nextLine.length === 0 || (!/[a-zA-Z]{3,}/.test(nextLine) && nextLine.length > 0 && nextLine.length < 25 ))) { if (panelCount < 3) { simplePanels.push({ascii: currentAscii.trim(), text: currentText.trim()}); panelCount++; } currentAscii = ""; currentText = ""; foundTextForPanel = false; if(panelCount === 3) break; } } if (simplePanels.length === 3) { console.warn("Used fallback parsing method."); return simplePanels; } return null; } }


    // --- Initialization and Exit ---
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        console.log("Initializing Comic Strip App (v2 - Prompt v10 - Dynamic Themes)..."); // Log version
        gameUiContainer = _gameUiContainer; messageCallback = _messageCallback; apiCaller = _apiCaller;
        currentUserName = userName || "User"; currentPersonaInGame = persona || 'Mika';
        if (!gameUiContainer) { console.error("Comic Strip UI container not provided!"); if(messageCallback) messageCallback('System', 'Error: Comic Strip UI container missing!'); return; }
        _loadGenerationCount(); // Load count first
        _loadThemes(); // Load themes (uses default if needed)
        _loadCache(); // Load comic cache
        _createMainUI();
        console.log(`Comic Strip App (v2) initialized for ${currentUserName}. Gen count: ${generationCount}. Themes loaded: ${currentThemes.length}`);
    }

    function onExit() {
        console.log("ComicStripApp onExit called.");
        // No intervals to clear, just reset state vars if needed
        isGenerating = false;
        currentView = 'main'; // Reset view on exit
        return Promise.resolve(true);
    }

    // --- Public Interface ---
    return {
        init: init,
        onExit: onExit
    };

})();

// --- END OF FILE comicstrip.js --- (REVISING PROMPT FOR MORE CONTEXT/HUMOR - V11)