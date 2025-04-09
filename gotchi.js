// --- START OF FILE gotchi.js ---

// Nyaa~! Mika-Gotchi (and... Kana-Gotchi?) - Take Care of Me, {user}! ♡
// Version 1.4.1 - Background Color Fix (Based on v1.4.0)

const MikaGotchi = (() => {
    // --- Settings & Constants ---
    const STORAGE_KEY = 'mikaGotchiData_v1';
    const UPDATE_INTERVAL_MS = 5000;
    const MESSAGE_POPUP_INTERVAL_MS = 45000;
    const API_MESSAGE_BATCH_SIZE = 7;
    const MAX_STAT_VALUE = 100;
    const MIN_STAT_VALUE = 0;
    const POO_INCIDENT_CHANCE_PER_DAY = 0.25; // 25% chance each day

    // Stat decay/gain rates
    const HUNGER_DECAY_RATE = 1; const HAPPINESS_DECAY_RATE = 1; const ENERGY_DECAY_RATE = 0.5; const AFFECTION_DECAY_RATE = 0.2;
    const FEED_HUNGER_GAIN = 30; const FEED_HAPPINESS_GAIN = 5; const PLAY_HAPPINESS_GAIN = 25; const PLAY_ENERGY_LOSS = 15;
    const NAP_ENERGY_GAIN_RATE = 5; const NAP_HAPPINESS_LOSS = 1; const HEADPAT_HAPPINESS_GAIN = 10; const HEADPAT_AFFECTION_GAIN = 15;
    const CLEAN_HAPPINESS_GAIN = 5; const DAILY_TASK_AFFECTION_GAIN = 10;
    const CLEAN_POO_HAPPINESS_GAIN = 20; // Extra boost for cleaning the mess!
    const CLEAN_POO_AFFECTION_GAIN = 15; // Affection boost too!

    // Music Placeholders
    const MIKA_MUSIC_SRC = 'path/to/mika_theme.mp3'; // Placeholder
    const KANA_MUSIC_SRC = 'path/to/kana_theme.mp3'; // Placeholder

    // Simple Graphics Colors
    const MIKA_COLORS = { body: '#ffc1e3', accent: '#f48fb1', eyes: '#222' };
    const KANA_COLORS = { body: '#5c546d', accent: '#423d51', eyes: '#111' }; // Darker purple/grey

    // --- State ---
    let gameUiContainer = null; let messageCallback = null; let apiCaller = null;
    let currentUserName = "User"; let currentPersonaInGame = 'Mika';
    let hunger = 80; let happiness = 80; let energy = 90; let affection = 70;
    let lastUpdateTime = Date.now(); let lastMessageTime = Date.now();
    let isNapping = false; let currentMessages = []; let isApiFetchingMessages = false;
    let lastMemory = "neutral"; let dailyTasks = { greeted: false, fed_check: false, played_check: false, checked_in: false, tidied: false };
    let dailyStreak = 0; let lastCheckinDay = null;
    let currentMood = "content"; let currentMoodEmoji = "😊";
    let gameLoopIntervalId = null; let messagePopupIntervalId = null; let musicAudioElement = null;
    let pooIncidentActive = false; // Is there an active mess?
    let blamedPersona = null; // Who is being blamed ('Mika' or 'Kana')

    // Fallback Messages (Structured by persona and mood)
    const fallbackMessages = {
        Mika: {
            happy: ["Nyaa~! Feeling great!", "*purrrr*", "Hehe~ ♡", "Everything's perfect with {user}!"],
            playful: ["Let's play, {user}!", "*bounces*", "Ready for fun!", "Tease time? 😉"],
            needy: ["{user}...", "Pay attention to me!", "Headpats? <.<", "Don't ignore me! >.<"],
            grumpy: ["Hmph!", "*pout*", "Not happy right now...", "Need something..."],
            sleepy: ["*yawn*", "Sleepy kitty...", "Nap time soon?", "Zzzz..."],
            hungry: ["Tummy rumbles...", "Feed me, {user}!", "Snack time? Nyaa~!"],
            generic: ["Nyaa~?", "{user}?", "*swishes tail*", "..."]
        },
        Kana: {
            content: ["...", "*stares*", "Fine.", "Acceptable state."],
            grumpy: ["*Sigh*", "Annoyed.", "What now?", "Leave me alone."],
            sleepy: ["Tired.", "Need sleep.", "Don't bother me.", "Zzz."],
            hungry: ["Feed me.", "Hungry.", "Food. Now.", "{user}. Sustenance."],
            generic: ["...", "{user}?", "*slight ear twitch*", "Hmph."]
        }
    };

    // --- DOM Element References ---
    let moodEmojiDisplay = null;
    let hungerBarFill = null; let happinessBarFill = null; let energyBarFill = null; let affectionBarFill = null;
    let feedButton = null; let playButton = null; let cleanButton = null; let napButton = null; let headpatButton = null;
    let messageDisplayArea = null; let dailyTaskButton = null;
    let characterGraphicContainer = null;
    let charBody = null; let charEarLeft = null; let charEarRight = null;
    let charEyeLeft = null; let charEyeRight = null; let charTail = null;
    let bounceAnimation = null; let walkAnimation = null;
    let tasksPopupOverlay = null; let tasksPopupContent = null; let tasksPopupCloseButton = null; let tasksPopupStreakDisplay = null;
    let pooVisualElement = null; // Reference for the visual cue

    // --- Helper Functions ---
    function _getCurrentTimestamp() { return Date.now(); }
    function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }
    function _clampStat(value) { return Math.max(MIN_STAT_VALUE, Math.min(MAX_STAT_VALUE, value)); }

    // --- Persistence ---
    // Save/Load includes poo state
    function _saveState() {
        const state = {
            hunger, happiness, energy, affection, lastMemory, dailyTasks, dailyStreak, lastCheckinDay, lastUpdateTime, isNapping,
            pooIncidentActive, // Save new state
            blamedPersona      // Save new state
        };
        try { localStorage.setItem(STORAGE_KEY + `_${currentPersonaInGame}`, JSON.stringify(state)); }
        catch (e) { console.error("Failed to save Gotchi state:", e); }
    }

    function _loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY + `_${currentPersonaInGame}`);
            if (saved) {
                const state = JSON.parse(saved);
                hunger = state.hunger ?? 80; happiness = state.happiness ?? 80; energy = state.energy ?? 90; affection = state.affection ?? 70;
                lastMemory = state.lastMemory ?? "neutral"; dailyTasks = state.dailyTasks ?? { greeted: false, fed_check: false, played_check: false, checked_in: false, tidied: false };
                dailyStreak = state.dailyStreak ?? 0; lastCheckinDay = state.lastCheckinDay ?? null; lastUpdateTime = state.lastUpdateTime ?? Date.now(); isNapping = state.isNapping ?? false;
                // --- Load Poo State ---
                pooIncidentActive = state.pooIncidentActive ?? false;
                blamedPersona = state.blamedPersona ?? null;
                // --- End Load Poo State ---
                console.log(`Gotchi state loaded for ${currentPersonaInGame}. Poo Active: ${pooIncidentActive}`);
                const now = _getCurrentTimestamp(); const secondsSinceLastSave = (now - lastUpdateTime) / 1000;
                if (secondsSinceLastSave > 0) {
                    console.log(`Simulating decay for ${secondsSinceLastSave.toFixed(0)}s since last save.`);
                    const intervalsToSimulate = secondsSinceLastSave / (UPDATE_INTERVAL_MS / 1000);
                    if (isNapping) {
                        energy = _clampStat(energy + NAP_ENERGY_GAIN_RATE * intervalsToSimulate); happiness = _clampStat(happiness - NAP_HAPPINESS_LOSS * intervalsToSimulate); hunger = _clampStat(hunger - (HUNGER_DECAY_RATE / 2) * intervalsToSimulate);
                        if (energy >= MAX_STAT_VALUE) isNapping = false; // Auto-wake if fully rested
                    } else {
                        hunger = _clampStat(hunger - HUNGER_DECAY_RATE * intervalsToSimulate); happiness = _clampStat(happiness - HAPPINESS_DECAY_RATE * intervalsToSimulate); energy = _clampStat(energy - ENERGY_DECAY_RATE * intervalsToSimulate); affection = _clampStat(affection - AFFECTION_DECAY_RATE * intervalsToSimulate);
                    }
                    lastUpdateTime = now; console.log(`Simulated decay complete. New stats: H:${hunger.toFixed(0)}, Hap:${happiness.toFixed(0)}, E:${energy.toFixed(0)}, Aff:${affection.toFixed(0)}`);
                } return true;
            }
        } catch (e) { console.error("Failed to load Gotchi state:", e); localStorage.removeItem(STORAGE_KEY + `_${currentPersonaInGame}`); }
        // Reset defaults including poo state if load fails
        lastUpdateTime = Date.now(); lastCheckinDay = _getCurrentDateString();
        pooIncidentActive = false; blamedPersona = null; // Ensure poo state is reset on failed load
        console.log(`No saved state found for ${currentPersonaInGame}, using defaults.`); return false;
    }

    // --- Core Game Logic ---
    // Mood check considers poo state
    function _updateStats() {
        const now = _getCurrentTimestamp(); const elapsedSeconds = (now - lastUpdateTime) / 1000; const intervalsPassed = elapsedSeconds / (UPDATE_INTERVAL_MS / 1000);
        if (intervalsPassed < 0.1) return;
        if (isNapping) {
            energy = _clampStat(energy + NAP_ENERGY_GAIN_RATE * intervalsPassed); happiness = _clampStat(happiness - NAP_HAPPINESS_LOSS * intervalsPassed); hunger = _clampStat(hunger - (HUNGER_DECAY_RATE / 2) * intervalsPassed);
            if (energy >= MAX_STAT_VALUE) { _handleNapToggle(); } // Auto-wake if fully rested
        } else {
            hunger = _clampStat(hunger - HUNGER_DECAY_RATE * intervalsPassed); happiness = _clampStat(happiness - HAPPINESS_DECAY_RATE * intervalsPassed); energy = _clampStat(energy - ENERGY_DECAY_RATE * intervalsPassed); affection = _clampStat(affection - AFFECTION_DECAY_RATE * intervalsPassed);
        }
        lastUpdateTime = now; _updateStatBars(); _calculateMoodAndEmoji(); _updateCharacterVisuals(); _updateCommandButtons();
    }

    // _calculateMoodAndEmoji prioritizes poo state
    function _calculateMoodAndEmoji() {
        let calculatedMood = "content"; let emoji = "😊"; if (currentPersonaInGame === 'Kana') emoji = "😑";
        if (isNapping) { calculatedMood = "sleepy"; emoji = "😴"; }
        // Check poo state first for mood override
        else if (pooIncidentActive) { calculatedMood = "grumpy"; emoji = currentPersonaInGame === 'Mika' ? "😠" : "💢"; }
        // Then check other states
        else if (hunger < 25) { calculatedMood = "hungry"; emoji = currentPersonaInGame === 'Mika' ? "🥺" : "😠"; }
        else if (happiness < 35) { calculatedMood = "grumpy"; emoji = currentPersonaInGame === 'Mika' ? "😠" : "💢"; }
        else if (affection < 40 && happiness < 50) { calculatedMood = "needy"; emoji = currentPersonaInGame === 'Mika' ? "🥺" : "😒"; }
        else if (energy < 30) { calculatedMood = "sleepy"; emoji = currentPersonaInGame === 'Mika' ? "🥱" : "😩"; }
        else if (happiness > 80 && energy > 60) { calculatedMood = "playful"; emoji = currentPersonaInGame === 'Mika' ? "🥳" : "😼"; }
        else if (happiness > 70 && affection > 70) { calculatedMood = "happy"; emoji = currentPersonaInGame === 'Mika' ? "💖" : "😌"; }

        if (currentMood !== calculatedMood || currentMoodEmoji !== emoji) {
            currentMood = calculatedMood; currentMoodEmoji = emoji;
            // Fetch messages if mood changed significantly OR if poo is active
            if (!isApiFetchingMessages && (pooIncidentActive || (calculatedMood !== "content" && calculatedMood !== "happy"))) {
                console.log("Mood/Poo state change, fetching messages.");
                _fetchNewMessages();
            }
        }
    }

    // Handle daily reset and potential poo incident
    function _handleDailyReset() {
        const today = _getCurrentDateString();
        if (lastCheckinDay && lastCheckinDay !== today) {
            console.log(`Daily Reset Triggered. Last: ${lastCheckinDay}, Today: ${today}`);

            // Check for Poo Incident Chance
            let newPooOccurred = false;
            if (!pooIncidentActive && Math.random() < POO_INCIDENT_CHANCE_PER_DAY) {
                pooIncidentActive = true;
                blamedPersona = (currentPersonaInGame === 'Mika') ? 'Kana' : 'Mika'; // Blame the *other* one
                happiness = _clampStat(happiness - 15); // Penalty for the mess
                newPooOccurred = true;
                console.log(`💩 Oh no! A poo incident occurred! Blaming ${blamedPersona}.`);
                lastMemory = "poo_incident_occurred"; // Specific memory
            }

            // Memory/streak logic
            if (!newPooOccurred) { // Don't overwrite poo memory
                 if (hunger < 30) { lastMemory = "neglected_hunger"; }
                 else if (happiness < 40) { lastMemory = "neglected_happiness"; }
                 else if (affection < 50) { lastMemory = "neglected_affection"; }
                 else if (dailyTasks.fed_check && dailyTasks.played_check && dailyTasks.greeted) { lastMemory = "cared_for_well"; }
                 else { lastMemory = "neutral"; }
            }
            const allTasksDoneYesterday = Object.values(dailyTasks).every(status => status);
            if (allTasksDoneYesterday) {
                 dailyStreak++; affection = _clampStat(affection + 5); happiness = _clampStat(happiness + 5);
            } else {
                 dailyStreak = 0;
            }

            dailyTasks = { greeted: false, fed_check: false, played_check: false, checked_in: false, tidied: false };
            lastCheckinDay = today;
            _saveState();
            _fetchNewMessages(true); // Force fetch relevant messages
            _displayRandomMessage(); // Show a relevant message
            _updatePooVisual(); // Update visual

        } else if (!lastCheckinDay) { // First ever check-in
            lastCheckinDay = today; lastMemory = "first_meeting";
            pooIncidentActive = false; blamedPersona = null; // No poo on first day
            _saveState();
            _fetchNewMessages(true);
            _updatePooVisual();
            console.log("First time check-in.");
        }
        _updateDailyTaskDisplay();
    }

    // --- API & Message Handling ---
    // _fetchNewMessages includes poo incident context in prompt
    async function _fetchNewMessages(forceRefresh = false) {
        if (!apiCaller || (isApiFetchingMessages && !forceRefresh)) return;
        isApiFetchingMessages = true;
        console.log(`Fetching messages for ${currentPersonaInGame}. Mood: ${currentMood}, Mem: ${lastMemory}, PooActive: ${pooIncidentActive}`);
        const personaDesc = currentPersonaInGame === 'Mika' ? `You are Mika: bubbly, playful, possessive, energetic catgirl.` : `You are Kana: sarcastic, grumpy, aloof, witty catgirl.`;

        // Build prompt with conditional poo instructions
        let specialInstructions = "";
        if (pooIncidentActive && blamedPersona) {
            specialInstructions = `\n\n**VERY IMPORTANT SPECIAL SITUATION:** A mess (💩) has appeared! You MUST act innocent and DENY making it. Blame the other catgirl, ${blamedPersona}, directly or indirectly. Examples: "Ew, {user}! ${blamedPersona} must have done that!" or "*Tsk*. Don't look at me. Obviously the ${blamedPersona === 'Mika' ? 'pink' : 'purple'} one's fault." Focus messages on this denial and blaming.`;
        }

        const prompt = `[ROLE: Generate ${API_MESSAGE_BATCH_SIZE} short, random messages for a Tamagotchi-like character.]
Character: ${currentPersonaInGame} (${personaDesc})
Interacting with: ${currentUserName}
Current State: Mood: ${currentMood}, Hunger: ${hunger.toFixed(0)}/100, Happiness: ${happiness.toFixed(0)}/100, Energy: ${energy.toFixed(0)}/100, Affection towards ${currentUserName}: ${affection.toFixed(0)}/100, Memory from yesterday: ${lastMemory}, Napping: ${isNapping}.${specialInstructions}
Instructions: Generate a list of ${API_MESSAGE_BATCH_SIZE} distinct, short (5-15 words) messages that ${currentPersonaInGame} might say randomly, reflecting their personality and current state/memory/situation. Address ${currentUserName} directly. Format as a simple numbered list. Output ONLY the list.`;

        try {
            const response = await apiCaller(prompt, []);
            if (response) {
                const lines = response.split('\n'); const newMessages = lines.map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(line => line.length > 1 && line.length < 100);
                if (newMessages.length > 0) { currentMessages = newMessages; console.log(`Fetched ${currentMessages.length} messages (Poo Active: ${pooIncidentActive}).`); }
                else { console.warn("API returned no valid messages."); currentMessages = []; }
            } else { console.warn("API empty response for messages."); currentMessages = []; }
        } catch (error) { console.error("Failed to fetch messages:", error); currentMessages = []; }
        finally { isApiFetchingMessages = false; }
    }

    // _getRandomMessage prioritizes grumpy if poo active
    function _getRandomMessage() {
        if (currentMessages.length > 0) { return currentMessages[Math.floor(Math.random() * currentMessages.length)].replace(/{user}/g, currentUserName); }
        // Fallback logic
        const personaFallbacks = fallbackMessages[currentPersonaInGame] || fallbackMessages.Mika;
        let moodKey = currentMood;
        if (pooIncidentActive) { moodKey = "grumpy"; } // Prioritize grumpy if poo active
        const moodFallbacks = personaFallbacks[moodKey] || personaFallbacks.generic || ["..."];
        return moodFallbacks[Math.floor(Math.random() * moodFallbacks.length)].replace(/{user}/g, currentUserName);
    }

    function _displayRandomMessage() {
        if (isNapping || !messageDisplayArea) return;
        const message = _getRandomMessage();
        console.log(`Displaying message (Poo Active: ${pooIncidentActive}):`, message);
        messageDisplayArea.textContent = message; messageDisplayArea.style.transition = 'opacity 0.3s ease-in'; messageDisplayArea.style.opacity = '1';
        if (messageDisplayArea.fadeTimeout) clearTimeout(messageDisplayArea.fadeTimeout);
        messageDisplayArea.fadeTimeout = setTimeout(() => { if (messageDisplayArea) { messageDisplayArea.style.transition = 'opacity 1s ease-out'; messageDisplayArea.style.opacity = '0'; } }, 4000);
        // Fetch new messages if running low or if poo state requires specific blaming messages
        if ((pooIncidentActive || currentMessages.length < 2) && !isApiFetchingMessages) {
             _fetchNewMessages();
        }
    }

    // --- Music Handling ---
    function _updateMusic() {
        const musicSrc = (currentPersonaInGame === 'Kana') ? KANA_MUSIC_SRC : MIKA_MUSIC_SRC;
        if (!musicAudioElement) { musicAudioElement = new Audio(); musicAudioElement.loop = true; musicAudioElement.volume = 0.3; }
        const currentPath = musicAudioElement.currentSrc ? new URL(musicAudioElement.currentSrc, window.location.href).pathname : ''; const targetPath = new URL(musicSrc, window.location.href).pathname;
        if (!currentPath.endsWith(targetPath)) { musicAudioElement.pause(); musicAudioElement.src = musicSrc; console.log(`Set music source: ${musicSrc.split('/').pop()}`); }
        if (!isNapping) { if (musicAudioElement.src && musicAudioElement.paused) { musicAudioElement.play().catch(e => console.warn(`Music play failed for ${currentPersonaInGame}:`, e.name, e.message)); } }
        else { if (!musicAudioElement.paused) { musicAudioElement.pause(); } }
    }

    function _stopMusic() {
        if (musicAudioElement && !musicAudioElement.paused) { musicAudioElement.pause(); musicAudioElement.src = ''; }
         musicAudioElement = null; console.log("Music stopped.");
    }

    // --- UI Rendering ---
    // _clearUI no longer removes specific background classes
    function _clearUI() {
        if (gameUiContainer) {
            // No longer need to remove specific classes here
            gameUiContainer.innerHTML = '';
        }
        moodEmojiDisplay = hungerBarFill = happinessBarFill = energyBarFill = affectionBarFill = feedButton = playButton = cleanButton = napButton = headpatButton = messageDisplayArea = dailyTaskButton = characterGraphicContainer = charBody = charEarLeft = charEarRight = charEyeLeft = charEyeRight = charTail = tasksPopupOverlay = tasksPopupContent = tasksPopupCloseButton = tasksPopupStreakDisplay = null;
        pooVisualElement = null;
        if (bounceAnimation) bounceAnimation.cancel(); bounceAnimation = null;
        if (walkAnimation) walkAnimation.cancel(); walkAnimation = null;
    }

    // _createMainUI no longer adds specific background classes
    function _createMainUI() {
        _clearUI();
        if (!gameUiContainer) return;

        // No background class addition here

        // Base container styles (Background inherited from app-area's theme)
        gameUiContainer.style.cssText = `width: 100%; height: 100%; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box; align-items: center; position: relative; overflow: hidden;`;

        // 1. Stat Bars Area (Use class for color)
        const statsArea = document.createElement('div');
        statsArea.classList.add('gotchi-stats-area'); // Class for text color
        statsArea.style.cssText = `width: 90%; max-width: 400px; display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; margin-bottom: 15px; font-size: 0.8em; flex-shrink: 0;`;
        const createBar = (label, id) => {
            const labelNode = document.createElement('span');
            labelNode.textContent = label;
            labelNode.style.textAlign = 'right';
            statsArea.appendChild(labelNode);
            const barBg = document.createElement('div');
            barBg.style.cssText = `height: 12px; background-color: rgba(0,0,0,0.2); border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.2);`;
            const barFill = document.createElement('div');
            barFill.id = id;
            barFill.style.cssText = `height: 100%; width: 50%; background: linear-gradient(to right, #f06292, #ff8a80); border-radius: 6px 0 0 6px; transition: width 0.5s ease-out;`;
            barBg.appendChild(barFill);
            statsArea.appendChild(barBg);
            return barFill;
        };
        hungerBarFill = createBar('Hunger 🍖:', 'gotchi-hunger-fill');
        happinessBarFill = createBar('Happy ✨:', 'gotchi-happiness-fill');
        energyBarFill = createBar('Energy ⚡:', 'gotchi-energy-fill');
        affectionBarFill = createBar('Affection ♡:', 'gotchi-affection-fill');
        // Assign specific bar gradients
        if (hungerBarFill) hungerBarFill.style.background = 'linear-gradient(to right, #ffcc80, #ffab40)';
        if (happinessBarFill) happinessBarFill.style.background = 'linear-gradient(to right, #a5d6a7, #66bb6a)';
        if (energyBarFill) energyBarFill.style.background = 'linear-gradient(to right, #90caf9, #42a5f5)';
        if (affectionBarFill) affectionBarFill.style.background = 'linear-gradient(to right, #f48fb1, #f06292)';
        gameUiContainer.appendChild(statsArea);

        // 2. Character Display Area
        const characterArea = document.createElement('div');
        characterArea.style.cssText = `flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; width: 100%; min-height: 150px;`;
        moodEmojiDisplay = document.createElement('div');
        moodEmojiDisplay.id = 'gotchi-mood-emoji';
        moodEmojiDisplay.style.cssText = `position: absolute; top: -5px; font-size: 2.5em; text-shadow: 0 0 5px rgba(0,0,0,0.3); z-index: 2; transition: opacity 0.3s;`;
        characterArea.appendChild(moodEmojiDisplay);
        characterGraphicContainer = document.createElement('div');
        characterGraphicContainer.id = 'gotchi-graphic-container';
        characterGraphicContainer.style.cssText = `width: 80px; height: 100px; position: relative; margin-top: 30px;`;
        // Determine colors based on persona
        const colors = (currentPersonaInGame === 'Kana') ? KANA_COLORS : MIKA_COLORS;
        const bodySize = 60; const earSize = 20; const eyeSize = 8; const tailWidth = 8; const tailHeight = 35;
        // Create body and parts
        charBody = document.createElement('div'); charBody.id = 'gotchi-body'; charBody.style.cssText = `position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: ${bodySize}px; height: ${bodySize}px; background-color: ${colors.body}; border-radius: 10px; border: 1px solid ${colors.accent};`; characterGraphicContainer.appendChild(charBody);
        charEarLeft = document.createElement('div'); charEarLeft.id = 'gotchi-ear-left'; charEarLeft.style.cssText = `position: absolute; top: -${earSize * 0.8}px; left: ${bodySize * 0.1}px; width: 0; height: 0; border-left: ${earSize / 2}px solid transparent; border-right: ${earSize / 2}px solid transparent; border-bottom: ${earSize}px solid ${colors.accent};`; charBody.appendChild(charEarLeft);
        charEarRight = document.createElement('div'); charEarRight.id = 'gotchi-ear-right'; charEarRight.style.cssText = `position: absolute; top: -${earSize * 0.8}px; right: ${bodySize * 0.1}px; width: 0; height: 0; border-left: ${earSize / 2}px solid transparent; border-right: ${earSize / 2}px solid transparent; border-bottom: ${earSize}px solid ${colors.accent};`; charBody.appendChild(charEarRight);
        charEyeLeft = document.createElement('div'); charEyeLeft.id = 'gotchi-eye-left'; charEyeLeft.style.cssText = `position: absolute; top: ${bodySize * 0.3}px; left: ${bodySize * 0.25}px; width: ${eyeSize}px; height: ${eyeSize}px; background-color: ${colors.eyes}; border-radius: 50%; transition: all 0.2s ease;`; charBody.appendChild(charEyeLeft);
        charEyeRight = document.createElement('div'); charEyeRight.id = 'gotchi-eye-right'; charEyeRight.style.cssText = `position: absolute; top: ${bodySize * 0.3}px; right: ${bodySize * 0.25}px; width: ${eyeSize}px; height: ${eyeSize}px; background-color: ${colors.eyes}; border-radius: 50%; transition: all 0.2s ease;`; charBody.appendChild(charEyeRight);
        charTail = document.createElement('div'); charTail.id = 'gotchi-tail'; charTail.style.cssText = `position: absolute; bottom: ${bodySize * 0.1}px; left: -${tailWidth * 1.5}px; width: ${tailWidth}px; height: ${tailHeight}px; border-radius: 4px 4px 10px 10px / 50px 50px 10px 10px; background-color: ${colors.accent}; transform-origin: bottom right; animation: tail-sway 2s ease-in-out infinite alternate;`;
        // Apply animations
        const tailSwayKeyframes = [{ transform: 'rotate(-10deg)' }, { transform: 'rotate(10deg)' }];
        charTail.animate(tailSwayKeyframes, { duration: 1500 + Math.random() * 500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
        charBody.appendChild(charTail);
        // Ensure keyframes are added if not present
        if (!document.getElementById('gotchi-animations')) {
            const styleSheet = document.createElement("style");
            styleSheet.id = 'gotchi-animations';
            styleSheet.innerText = `@keyframes tail-sway { 0% { transform: rotate(-10deg); } 100% { transform: rotate(10deg); } } @keyframes walk-left-right { 0%, 100% { transform: translateX(-15px); } 50% { transform: translateX(15px); } }`;
            document.head.appendChild(styleSheet);
        }
        bounceAnimation = characterGraphicContainer.animate([{ transform: 'translateY(0px)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0px)' }], { duration: 900 + Math.random() * 200, iterations: Infinity, easing: 'ease-in-out' });
        walkAnimation = characterGraphicContainer.animate([ { marginLeft: '-15px' }, { marginLeft: '15px' } ], { duration: 3000 + Math.random()*1000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
        characterArea.appendChild(characterGraphicContainer);

        // Poo Visual Element (Hidden Initially)
        pooVisualElement = document.createElement('div');
        pooVisualElement.id = 'gotchi-poo-visual';
        pooVisualElement.textContent = '💩'; // The emoji visual
        pooVisualElement.style.cssText = `
            position: absolute;
            bottom: 5px; /* Position near the 'floor' */
            left: 60%; /* Offset slightly from center */
            font-size: 1.8em;
            opacity: 0; /* Hidden by default */
            transition: opacity 0.5s ease-in-out;
            z-index: 1; /* Behind character/mood */
            text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
            cursor: default; /* Not directly interactable */
        `;
        characterArea.appendChild(pooVisualElement);

        gameUiContainer.appendChild(characterArea);

        // 3. Message Display Area
        messageDisplayArea = document.createElement('div');
        messageDisplayArea.id = 'gotchi-message-display';
        messageDisplayArea.style.cssText = `position: absolute; bottom: 110px; left: 50%; transform: translateX(-50%); background-color: rgba(0, 0, 0, 0.7); color: white; padding: 8px 15px; border-radius: 15px; font-size: 0.9em; text-align: center; opacity: 0; transition: opacity 0.3s ease-in; z-index: 3; max-width: 80%; white-space: normal;`;
        gameUiContainer.appendChild(messageDisplayArea);

        // 4. Command Buttons Area
        const commandsArea = document.createElement('div');
        commandsArea.style.cssText = `display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 10px 0; flex-shrink: 0; width: 100%; max-width: 450px;`;
        const createButton = (text, id, handler, icon) => {
            const button = document.createElement('button');
            button.id = id;
            button.className = 'rps-choice-button';
            button.style.fontSize = '0.9em';
            button.style.padding = '8px 12px';
            button.innerHTML = `${icon ? icon + ' ' : ''}${text}`;
            button.onclick = handler;
            commandsArea.appendChild(button);
            return button;
        };
        feedButton = createButton('Feed', 'gotchi-feed-btn', _handleFeed, '🍖');
        playButton = createButton('Play', 'gotchi-play-btn', _handlePlay, '🧶');
        cleanButton = createButton('Clean', 'gotchi-clean-btn', _handleClean, '✨');
        napButton = createButton('Nap', 'gotchi-nap-btn', _handleNapToggle, '💤');
        headpatButton = createButton('Headpat', 'gotchi-headpat-btn', _handleHeadpat, '♡');
        gameUiContainer.appendChild(commandsArea);

        // 5. Daily Task Button
        dailyTaskButton = document.createElement('button');
        dailyTaskButton.id = 'gotchi-daily-tasks';
        dailyTaskButton.textContent = `Daily (X/Y)`;
        dailyTaskButton.className = 'rps-choice-button secondary';
        dailyTaskButton.style.cssText = `font-size: 0.8em; position: absolute; bottom: 10px; right: 10px; padding: 4px 8px; z-index: 5;`;
        dailyTaskButton.onclick = _showDailyTasksPopup;
        gameUiContainer.appendChild(dailyTaskButton);

        // Create Daily Tasks Popup (Hidden Initially)
        _createTasksPopup();

        // Ensure Gotchi CSS is present (for stat text color)
         if (!document.getElementById('gotchi-styles')) {
             const styleSheet = document.createElement("style");
             styleSheet.id = 'gotchi-styles';
             styleSheet.innerText = `
                /* Base text color for stats */
                .gotchi-stats-area { color: var(--chat-log-text, #ffe0f0); }
                /* No background color rules here anymore */
             `;
             document.head.appendChild(styleSheet);
         }

        // Final Setup
        _updateStatBars(); _calculateMoodAndEmoji(); _updateCharacterVisuals(); _updateCommandButtons(); _updateDailyTaskDisplay();
        _updatePooVisual(); // Initial check for poo visual state
    }

    // Create Tasks Popup
    function _createTasksPopup() {
        let existingPopup = document.getElementById('gotchi-tasks-popup-overlay');
        if (existingPopup) {
            tasksPopupOverlay = existingPopup; tasksPopupContent = document.getElementById('gotchi-tasks-popup-content'); tasksPopupCloseButton = tasksPopupOverlay.querySelector('.popup-button'); tasksPopupStreakDisplay = document.getElementById('gotchi-tasks-popup-streak');
             tasksPopupOverlay.style.display = 'none'; console.log("Reusing existing tasks popup."); return;
        }
        tasksPopupOverlay = document.createElement('div'); tasksPopupOverlay.id = 'gotchi-tasks-popup-overlay'; tasksPopupOverlay.className = 'popup-overlay'; tasksPopupOverlay.style.display = 'none'; tasksPopupOverlay.style.zIndex = '210';
        const modal = document.createElement('div'); modal.id = 'gotchi-tasks-popup-modal'; modal.className = 'popup-modal'; modal.style.textAlign = 'left';
        const title = document.createElement('h2'); title.textContent = "Today's Care Tasks ♡"; title.style.textAlign = 'center'; modal.appendChild(title);
        tasksPopupContent = document.createElement('div'); tasksPopupContent.id = 'gotchi-tasks-popup-content'; tasksPopupContent.style.marginBottom = '15px'; tasksPopupContent.style.lineHeight = '1.8'; modal.appendChild(tasksPopupContent);
        tasksPopupStreakDisplay = document.createElement('p'); tasksPopupStreakDisplay.id = 'gotchi-tasks-popup-streak'; tasksPopupStreakDisplay.style.textAlign = 'center'; tasksPopupStreakDisplay.style.fontWeight = 'bold'; tasksPopupStreakDisplay.style.marginTop = '10px'; modal.appendChild(tasksPopupStreakDisplay);
        const buttonContainer = document.createElement('div'); buttonContainer.className = 'popup-buttons';
        tasksPopupCloseButton = document.createElement('button'); tasksPopupCloseButton.textContent = 'Okay! ♡'; tasksPopupCloseButton.className = 'popup-button'; tasksPopupCloseButton.onclick = () => { if (tasksPopupOverlay) tasksPopupOverlay.style.display = 'none'; }; buttonContainer.appendChild(tasksPopupCloseButton); modal.appendChild(buttonContainer);
        tasksPopupOverlay.appendChild(modal); document.body.appendChild(tasksPopupOverlay); console.log("Created new tasks popup.");
    }

    // Update UI elements
    function _updateStatBars() {
        if (hungerBarFill) hungerBarFill.style.width = `${hunger}%`;
        if (happinessBarFill) happinessBarFill.style.width = `${happiness}%`;
        if (energyBarFill) energyBarFill.style.width = `${energy}%`;
        if (affectionBarFill) affectionBarFill.style.width = `${affection}%`;
    }

    function _updateCharacterVisuals() {
        if (moodEmojiDisplay) { moodEmojiDisplay.textContent = currentMoodEmoji; }
        const colors = (currentPersonaInGame === 'Kana') ? KANA_COLORS : MIKA_COLORS;
        const bodySize = 60; const eyeSize = 8;
        const eyeStyleNap = `height: 1px; background-color: transparent; border-top: 2px solid ${colors.eyes}; border-radius: 0; transform: translateY(4px); width: ${eyeSize * 1.2}px;`;
        const eyeStyleAwake = `height: ${eyeSize}px; background-color: ${colors.eyes}; border-radius: 50%; border-top: none; transform: translateY(0px); width: ${eyeSize}px;`;
        if (charEyeLeft && charEyeRight) {
            const baseEyeStyle = `position: absolute; top: ${bodySize * 0.3}px; transition: all 0.2s ease;`;
            const currentEyeStyle = isNapping ? eyeStyleNap : eyeStyleAwake;
            charEyeLeft.style.cssText = `${baseEyeStyle} left: ${bodySize * 0.25 - (isNapping ? eyeSize*0.1 : 0)}px; ${currentEyeStyle}`;
            charEyeRight.style.cssText = `${baseEyeStyle} right: ${bodySize * 0.25 - (isNapping ? eyeSize*0.1 : 0)}px; ${currentEyeStyle}`;
        }
        // Update animation states
        const playState = isNapping ? 'paused' : 'running';
        if (bounceAnimation && bounceAnimation.playState !== playState) { isNapping ? bounceAnimation.pause() : bounceAnimation.play(); }
        if (walkAnimation && walkAnimation.playState !== playState) { isNapping ? walkAnimation.pause() : walkAnimation.play(); }
    }

    // _updateCommandButtons disables others if poo is active
    function _updateCommandButtons() {
        const disableMostButtons = isNapping || pooIncidentActive; // Disable if napping OR if there's a mess

        if (feedButton) feedButton.disabled = disableMostButtons || hunger > 85;
        if (playButton) playButton.disabled = disableMostButtons || energy < 20 || happiness > 90;
        if (cleanButton) cleanButton.disabled = isNapping; // Clean button is ONLY disabled if napping, enabled if poo active
        if (napButton) { napButton.innerHTML = isNapping ? '☀️ Wake Up!' : '💤 Nap'; napButton.disabled = pooIncidentActive || (!isNapping && energy > 90); } // Disable nap if poo active
        if (headpatButton) headpatButton.disabled = disableMostButtons || affection > 95;
    }

    function _updateDailyTaskDisplay() {
        if (dailyTaskButton) {
            const tasksDone = Object.values(dailyTasks).filter(status => status).length;
            const totalTasks = Object.keys(dailyTasks).length;
            dailyTaskButton.textContent = `Daily (${tasksDone}/${totalTasks})`;
            dailyTaskButton.title = `View Daily Tasks (Streak: ${dailyStreak})`;
        }
    }

    function _showDailyTasksPopup() {
        if (!tasksPopupOverlay || !tasksPopupContent || !tasksPopupStreakDisplay) {
             console.error("Task popup elements not found! Attempting to recreate...");
             _createTasksPopup();
             if (!tasksPopupOverlay) { alert("Error showing task details."); return; }
        }
        tasksPopupContent.innerHTML = `
            <p>${dailyTasks.greeted ? '✅' : '❌'} Greeted ${currentPersonaInGame}</p>
            <p>${dailyTasks.fed_check ? '✅' : '❌'} Fed ${currentPersonaInGame} Today</p>
            <p>${dailyTasks.played_check ? '✅' : '❌'} Played with ${currentPersonaInGame}</p>
            <p>${dailyTasks.tidied ? '✅' : '❌'} Tidied Space</p>
            <p>${dailyTasks.checked_in ? '✅' : '❌'} Checked In</p>
        `;
        tasksPopupStreakDisplay.textContent = `Current Streak: ${dailyStreak} days!`;
        tasksPopupOverlay.style.display = 'flex';
        if (!dailyTasks.checked_in) { dailyTasks.checked_in = true; affection = _clampStat(affection + 5); _updateDailyTaskDisplay(); _updateStatBars(); _saveState(); }
    }

    // Update Poo Visual
    function _updatePooVisual() {
        if (pooVisualElement) {
            pooVisualElement.style.opacity = pooIncidentActive ? '1' : '0';
        }
    }

    // --- Event Handlers ---
    // Add pooIncidentActive check to handlers
    function _handleFeed() { if (isNapping || pooIncidentActive || hunger > 85) return; hunger = _clampStat(hunger + FEED_HUNGER_GAIN); happiness = _clampStat(happiness + FEED_HAPPINESS_GAIN); if (!dailyTasks.fed_check) affection = _clampStat(affection + 5); dailyTasks.fed_check = true; lastMemory = "fed_well"; _updateStats(); _saveState(); _displayRandomMessage(); if (!isApiFetchingMessages) _fetchNewMessages(); }
    function _handlePlay() { if (isNapping || pooIncidentActive || energy < 20 || happiness > 90) return; happiness = _clampStat(happiness + PLAY_HAPPINESS_GAIN); energy = _clampStat(energy - PLAY_ENERGY_LOSS); if (!dailyTasks.played_check) affection = _clampStat(affection + DAILY_TASK_AFFECTION_GAIN / 2); dailyTasks.played_check = true; lastMemory = "played_with"; _updateStats(); _saveState(); _displayRandomMessage(); if (!isApiFetchingMessages) _fetchNewMessages(); }
    function _handleNapToggle() { if (pooIncidentActive) return; isNapping = !isNapping; if (isNapping) { if (messagePopupIntervalId) clearInterval(messagePopupIntervalId); messagePopupIntervalId = null; _stopMusic(); if(messageDisplayArea) { if(messageDisplayArea.fadeTimeout) clearTimeout(messageDisplayArea.fadeTimeout); messageDisplayArea.style.transition = 'none'; messageDisplayArea.style.opacity = '0'; } } else { if (!messagePopupIntervalId) messagePopupIntervalId = setInterval(_displayRandomMessage, MESSAGE_POPUP_INTERVAL_MS); _updateMusic(); lastMemory = "woke_up"; _fetchNewMessages(); _displayRandomMessage(); } lastUpdateTime = Date.now(); _updateCharacterVisuals(); _updateCommandButtons(); _saveState(); console.log("Nap toggled:", isNapping); }
    function _handleHeadpat() { if (isNapping || pooIncidentActive || affection > 95) return; happiness = _clampStat(happiness + HEADPAT_HAPPINESS_GAIN); affection = _clampStat(affection + HEADPAT_AFFECTION_GAIN); if (!dailyTasks.greeted) affection = _clampStat(affection + 5); dailyTasks.greeted = true; lastMemory = "got_headpats"; _updateStats(); _saveState(); if (moodEmojiDisplay) moodEmojiDisplay.textContent = '💖'; if (characterGraphicContainer) characterGraphicContainer.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' }); setTimeout(() => _updateCharacterVisuals(), 400); _displayRandomMessage(); if (!isApiFetchingMessages) _fetchNewMessages(); }

    // _handleClean checks for poo incident first
    function _handleClean() {
        if (isNapping) return;

        if (pooIncidentActive) {
            // Clean up the poo incident
            console.log("Cleaning up poo incident!");
            pooIncidentActive = false;
            blamedPersona = null;
            happiness = _clampStat(happiness + CLEAN_POO_HAPPINESS_GAIN); // Bigger boost!
            affection = _clampStat(affection + CLEAN_POO_AFFECTION_GAIN); // Affection boost!
            lastMemory = "cleaned_up_mess";

            // Update tasks if not already done
            if (!dailyTasks.tidied) affection = _clampStat(affection + 3);
            dailyTasks.tidied = true;

            _updatePooVisual(); // Hide the visual cue
            _updateStats();     // Recalculate mood etc. AFTER boosts
            _saveState();
            _showSimpleConfirmation(`Thank you for cleaning that up, ${currentUserName}! ${currentPersonaInGame === 'Mika' ? '*Phew!* Must have been Kana...' : '*Hmph*. Finally.'} `); // Specific message
            _fetchNewMessages(true); // Get normal messages again
            _updateDailyTaskDisplay(); // Update task button after cleaning
        } else {
            // Normal cleaning
            happiness = _clampStat(happiness + CLEAN_HAPPINESS_GAIN);
            if (!dailyTasks.tidied) affection = _clampStat(affection + 3);
            dailyTasks.tidied = true;
            lastMemory = "cleaned_space";
            _updateStats();
            _saveState();
            _displayRandomMessage(); // Show a standard message
            _updateDailyTaskDisplay(); // Update task button after cleaning
            if (!isApiFetchingMessages) _fetchNewMessages(); // Fetch standard messages if needed
        }
    }

    // --- Initialization and Exit ---
    // init log message updated
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
         console.log(`Initializing MikaGotchi (v1.4.1 BG Fix) for ${userName}, Persona: ${persona}`); // Updated log
         gameUiContainer = _gameUiContainer; messageCallback = _messageCallback; apiCaller = _apiCaller;
         currentUserName = userName || "User"; currentPersonaInGame = persona || 'Mika';
         isApiFetchingMessages = false; currentMessages = [];
         pooIncidentActive = false; blamedPersona = null; // Reset poo state

         if (!gameUiContainer) { console.error("Gotchi UI container missing!"); if(messageCallback) messageCallback('System', 'Error: Gotchi UI container missing!'); return; }
         if (gameLoopIntervalId) clearInterval(gameLoopIntervalId); if (messagePopupIntervalId) clearInterval(messagePopupIntervalId);

         _loadState();
         _handleDailyReset();
         _createMainUI();

         gameLoopIntervalId = setInterval(_updateStats, UPDATE_INTERVAL_MS);
         if (!isNapping) {
             messagePopupIntervalId = setInterval(_displayRandomMessage, MESSAGE_POPUP_INTERVAL_MS);
             setTimeout(_displayRandomMessage, 1500);
         }

         // Fetch messages immediately unless poo incident just happened
         if (!pooIncidentActive && !isApiFetchingMessages) {
            _fetchNewMessages(true);
         } else if (pooIncidentActive && !isApiFetchingMessages) {
             console.log("Poo is active on init, messages should have been fetched by daily reset.");
         }

         _updateMusic();
         console.log(`MikaGotchi initialized. Mood: ${currentMood}, Napping: ${isNapping}, Poo Active: ${pooIncidentActive}`);
     }

    // onExit no longer removes specific background classes
    function onExit() {
        console.log("MikaGotchi onExit called.");
        if (gameLoopIntervalId) { clearInterval(gameLoopIntervalId); gameLoopIntervalId = null; }
        if (messagePopupIntervalId) { clearInterval(messagePopupIntervalId); messagePopupIntervalId = null; }
        if (messageDisplayArea && messageDisplayArea.fadeTimeout) { clearTimeout(messageDisplayArea.fadeTimeout); }
        const containerRef = gameUiContainer;
        _stopMusic();
        _saveState();
        let popup = document.getElementById('gotchi-tasks-popup-overlay'); if (popup?.parentNode === document.body) { document.body.removeChild(popup); } tasksPopupOverlay = null;

        // No longer need to remove specific classes from containerRef

        _clearUI();
        console.log("MikaGotchi cleanup complete."); return Promise.resolve(true);
    }

    // _showSimpleConfirmation (Needed by _handleClean)
    function _showSimpleConfirmation(message) {
        if (!gameUiContainer) { console.warn("Cannot show confirmation, UI container missing."); return; }
        const existingConfirmationArea = document.getElementById('gotchi-confirmation');
        let confirmationArea = existingConfirmationArea;

        if (!confirmationArea || !confirmationArea.parentNode) {
            confirmationArea = document.createElement('div');
            confirmationArea.id = 'gotchi-confirmation';
            confirmationArea.style.cssText = `
                position: absolute; top: 60px; left: 50%; transform: translateX(-50%);
                background-color: rgba(0, 150, 136, 0.85); /* Teal confirmation color */
                color: white; padding: 8px 15px; border-radius: 10px; font-size: 0.9em;
                text-align: center; opacity: 0; transition: opacity 0.5s ease-in-out;
                z-index: 4; max-width: 80%; pointer-events: none;
            `;
            gameUiContainer.appendChild(confirmationArea);
        }

        if (confirmationArea.fadeTimeout) clearTimeout(confirmationArea.fadeTimeout);
        if (confirmationArea.clearTimeout) clearTimeout(confirmationArea.clearTimeout);

        confirmationArea.textContent = message;
        confirmationArea.style.opacity = '1';

        confirmationArea.fadeTimeout = setTimeout(() => {
            if (confirmationArea) { confirmationArea.style.opacity = '0'; }
        }, 2500); // Show message for 2.5 seconds
    }

    // --- Public Interface ---
    return {
        init: init,
        onExit: onExit
    };

})();

// --- END OF FILE gotchi.js ---