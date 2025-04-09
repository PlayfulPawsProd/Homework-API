// --- START OF FILE gotchi.js ---

// Nyaa~! Mika-Gotchi (and... Kana-Gotchi?) - Take Care of Me, {user}! ♡
// Version 1.5.5 - Removed Bubble Background, Adjusted Text

const MikaGotchi = (() => {
    // --- Settings & Constants ---
    const STORAGE_KEY = 'mikaGotchiData_v1';
    const UPDATE_INTERVAL_MS = 5000;
    const MESSAGE_POPUP_INTERVAL_MS = 20000; // Timer for general mood messages
    const API_MESSAGE_BATCH_SIZE = 7; // For fetching background messages
    const MAX_STAT_VALUE = 100;
    const MIN_STAT_VALUE = 0;
    const POO_INCIDENT_CHANCE_PER_DAY = 0.25;
    // Thresholds for critical state messages
    const HUNGER_THRESHOLD = 25;
    const HAPPINESS_THRESHOLD = 35;
    const ENERGY_THRESHOLD = 30;

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
    let lastUpdateTime = Date.now();
    let isNapping = false; let currentMessages = []; let isApiFetchingMessages = false;
    let lastMemory = "neutral"; let dailyTasks = { greeted: false, fed_check: false, played_check: false, checked_in: false, tidied: false };
    let dailyStreak = 0; let lastCheckinDay = null;
    let currentMood = "content"; let currentMoodEmoji = "😊";
    let gameLoopIntervalId = null; let messagePopupIntervalId = null; let musicAudioElement = null;
    let pooIncidentActive = false; // Is there an active mess?
    let blamedPersona = null; // Who is being blamed ('Mika' or 'Kana')
    // Flags to track if critical state message has been shown
    let lowHungerNotified = false;
    let lowHappinessNotified = false;
    let lowEnergyNotified = false;
    // State for direct chat
    let isGotchiResponding = false; // Is the Gotchi generating a direct chat response?

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
    // Direct Chat UI References
    let gotchiChatInput = null;
    let gotchiSendButton = null;
    let gotchiChatArea = null;

    // --- Helper Functions ---
    function _getCurrentTimestamp() { return Date.now(); }
    function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }
    function _clampStat(value) { return Math.max(MIN_STAT_VALUE, Math.min(MAX_STAT_VALUE, value)); }

    // --- Persistence ---
    // Save/Load includes poo state and notification flags
    function _saveState() {
        const state = {
            hunger, happiness, energy, affection, lastMemory, dailyTasks, dailyStreak, lastCheckinDay, lastUpdateTime, isNapping,
            pooIncidentActive, blamedPersona,
            lowHungerNotified, lowHappinessNotified, lowEnergyNotified // Save flags
        };
        try { localStorage.setItem(STORAGE_KEY + `_${currentPersonaInGame}`, JSON.stringify(state)); }
        catch (e) { console.error("Failed to save Gotchi state:", e); }
    }

    function _loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY + `_${currentPersonaInGame}`);
            if (saved) {
                const state = JSON.parse(saved);
                // Load base stats
                hunger = state.hunger ?? 80; happiness = state.happiness ?? 80; energy = state.energy ?? 90; affection = state.affection ?? 70;
                lastMemory = state.lastMemory ?? "neutral"; dailyTasks = state.dailyTasks ?? { greeted: false, fed_check: false, played_check: false, checked_in: false, tidied: false };
                dailyStreak = state.dailyStreak ?? 0; lastCheckinDay = state.lastCheckinDay ?? null; lastUpdateTime = state.lastUpdateTime ?? Date.now(); isNapping = state.isNapping ?? false;
                // Load poo state
                pooIncidentActive = state.pooIncidentActive ?? false;
                blamedPersona = state.blamedPersona ?? null;
                // Load notification flags
                lowHungerNotified = state.lowHungerNotified ?? (hunger < HUNGER_THRESHOLD); // Set flag based on loaded state if missing
                lowHappinessNotified = state.lowHappinessNotified ?? (happiness < HAPPINESS_THRESHOLD);
                lowEnergyNotified = state.lowEnergyNotified ?? (energy < ENERGY_THRESHOLD);

                console.log(`Gotchi state loaded for ${currentPersonaInGame}. Poo Active: ${pooIncidentActive}`);
                // Simulate decay since last save
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
                     lastUpdateTime = now; console.log(`Simulated decay complete.`);
                     // Re-check notification flags after decay simulation
                     lowHungerNotified = hunger < HUNGER_THRESHOLD;
                     lowHappinessNotified = happiness < HAPPINESS_THRESHOLD;
                     lowEnergyNotified = energy < ENERGY_THRESHOLD;
                     console.log(`Stats after decay: H:${hunger.toFixed(0)}, Hap:${happiness.toFixed(0)}, E:${energy.toFixed(0)}, Aff:${affection.toFixed(0)}`);
                }
                return true;
            }
        } catch (e) { console.error("Failed to load Gotchi state:", e); localStorage.removeItem(STORAGE_KEY + `_${currentPersonaInGame}`); }
        // Reset defaults including flags if load fails
        lastUpdateTime = Date.now(); lastCheckinDay = _getCurrentDateString();
        pooIncidentActive = false; blamedPersona = null;
        lowHungerNotified = false; lowHappinessNotified = false; lowEnergyNotified = false;
        console.log(`No saved state found for ${currentPersonaInGame}, using defaults.`); return false;
    }


    // --- Core Game Logic ---
    // _updateStats checks thresholds and triggers messages
    function _updateStats() {
        const now = _getCurrentTimestamp(); const elapsedSeconds = (now - lastUpdateTime) / 1000; const intervalsPassed = elapsedSeconds / (UPDATE_INTERVAL_MS / 1000);
        if (intervalsPassed < 0.1) return;

        if (isNapping) {
            energy = _clampStat(energy + NAP_ENERGY_GAIN_RATE * intervalsPassed); happiness = _clampStat(happiness - NAP_HAPPINESS_LOSS * intervalsPassed); hunger = _clampStat(hunger - (HUNGER_DECAY_RATE / 2) * intervalsPassed);
            if (energy >= MAX_STAT_VALUE) { _handleNapToggle(); } // Auto-wake
        } else {
            hunger = _clampStat(hunger - HUNGER_DECAY_RATE * intervalsPassed);
            happiness = _clampStat(happiness - HAPPINESS_DECAY_RATE * intervalsPassed);
            energy = _clampStat(energy - ENERGY_DECAY_RATE * intervalsPassed);
            affection = _clampStat(affection - AFFECTION_DECAY_RATE * intervalsPassed);

            // Check Critical Thresholds
            if (hunger < HUNGER_THRESHOLD && !lowHungerNotified) {
                lowHungerNotified = true;
                console.log("Hunger critical threshold reached!");
                _fetchNewMessages(); // Fetch potentially hungry messages
                setTimeout(() => _displayGotchiMessage(_getRandomMessage()), 300); // Display a message shortly after
            } else if (hunger >= HUNGER_THRESHOLD && lowHungerNotified) {
                lowHungerNotified = false; // Reset flag when recovered
            }

            if (happiness < HAPPINESS_THRESHOLD && !lowHappinessNotified) {
                lowHappinessNotified = true;
                console.log("Happiness critical threshold reached!");
                _fetchNewMessages(); // Fetch potentially sad messages
                setTimeout(() => _displayGotchiMessage(_getRandomMessage()), 300);
            } else if (happiness >= HAPPINESS_THRESHOLD && lowHappinessNotified) {
                lowHappinessNotified = false;
            }

            if (energy < ENERGY_THRESHOLD && !lowEnergyNotified) {
                lowEnergyNotified = true;
                console.log("Energy critical threshold reached!");
                _fetchNewMessages(); // Fetch potentially tired messages
                setTimeout(() => _displayGotchiMessage(_getRandomMessage()), 300);
            } else if (energy >= ENERGY_THRESHOLD && lowEnergyNotified) {
                lowEnergyNotified = false;
            }
        }

        lastUpdateTime = now; _updateStatBars(); _calculateMoodAndEmoji(); _updateCharacterVisuals(); _updateCommandButtons();
    }

    // _calculateMoodAndEmoji drives background fetches
    function _calculateMoodAndEmoji() {
        let calculatedMood = "content"; let emoji = "😊"; if (currentPersonaInGame === 'Kana') emoji = "😑";
        if (isNapping) { calculatedMood = "sleepy"; emoji = "😴"; }
        // Check poo state first for mood override
        else if (pooIncidentActive) { calculatedMood = "grumpy"; emoji = currentPersonaInGame === 'Mika' ? "😠" : "💢"; }
        // Then check other states
        else if (hunger < HUNGER_THRESHOLD) { calculatedMood = "hungry"; emoji = currentPersonaInGame === 'Mika' ? "🥺" : "😠"; } // Use thresholds
        else if (happiness < HAPPINESS_THRESHOLD) { calculatedMood = "grumpy"; emoji = currentPersonaInGame === 'Mika' ? "😠" : "💢"; }
        else if (affection < 40 && happiness < 50) { calculatedMood = "needy"; emoji = currentPersonaInGame === 'Mika' ? "🥺" : "😒"; }
        else if (energy < ENERGY_THRESHOLD) { calculatedMood = "sleepy"; emoji = currentPersonaInGame === 'Mika' ? "🥱" : "😩"; }
        else if (happiness > 80 && energy > 60) { calculatedMood = "playful"; emoji = currentPersonaInGame === 'Mika' ? "🥳" : "😼"; }
        else if (happiness > 70 && affection > 70) { calculatedMood = "happy"; emoji = currentPersonaInGame === 'Mika' ? "💖" : "😌"; }

        if (currentMood !== calculatedMood || currentMoodEmoji !== emoji) {
            currentMood = calculatedMood; currentMoodEmoji = emoji;
            // Fetch new messages if mood changes significantly OR if poo active OR if a critical threshold *might* have been crossed
            if (!isApiFetchingMessages && (pooIncidentActive || (calculatedMood !== "content" && calculatedMood !== "happy") || lowHungerNotified || lowHappinessNotified || lowEnergyNotified )) {
                console.log("Mood/Poo/Threshold state change, fetching background messages.");
                _fetchNewMessages();
            }
        }
    }

    // _handleDailyReset handles poo and triggers important messages
    function _handleDailyReset() {
        const today = _getCurrentDateString();
        if (lastCheckinDay && lastCheckinDay !== today) {
            console.log(`Daily Reset Triggered. Last: ${lastCheckinDay}, Today: ${today}`);

            // Reset notification flags for the new day
            lowHungerNotified = false; lowHappinessNotified = false; lowEnergyNotified = false;

            // Check for Poo Incident Chance
            let newPooOccurred = false;
            if (!pooIncidentActive && Math.random() < POO_INCIDENT_CHANCE_PER_DAY) {
                pooIncidentActive = true;
                blamedPersona = (currentPersonaInGame === 'Mika') ? 'Kana' : 'Mika';
                happiness = _clampStat(happiness - 15);
                newPooOccurred = true;
                console.log(`💩 Oh no! A poo incident occurred! Blaming ${blamedPersona}.`);
                lastMemory = "poo_incident_occurred";
            }

            // Memory/streak logic
            if (!newPooOccurred) {
                 if (hunger < HUNGER_THRESHOLD) { lastMemory = "neglected_hunger"; }
                 else if (happiness < HAPPINESS_THRESHOLD) { lastMemory = "neglected_happiness"; }
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
            _fetchNewMessages(true); // Always fetch on new day

            if(newPooOccurred) {
                 setTimeout(() => _displayGotchiMessage(_getRandomMessage()), 500); // <<< Display blaming message soon
            }
            _updatePooVisual();

        } else if (!lastCheckinDay) { // First ever check-in
            lastCheckinDay = today; lastMemory = "first_meeting";
            pooIncidentActive = false; blamedPersona = null;
            lowHungerNotified = false; lowHappinessNotified = false; lowEnergyNotified = false; // Init flags
            _saveState();
            _fetchNewMessages(true);
            _updatePooVisual();
            console.log("First time check-in.");
        }
        _updateDailyTaskDisplay();
    }

    // --- API & Message Handling ---
    // _fetchNewMessages for background messages
    async function _fetchNewMessages(forceRefresh = false) {
        if (!apiCaller || (isApiFetchingMessages && !forceRefresh)) return;
        isApiFetchingMessages = true;
        console.log(`Fetching background messages for ${currentPersonaInGame}. Mood: ${currentMood}, Mem: ${lastMemory}, PooActive: ${pooIncidentActive}`);
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
                if (newMessages.length > 0) { currentMessages = newMessages; console.log(`Fetched ${currentMessages.length} background messages.`); }
                else { console.warn("API returned no valid background messages."); currentMessages = []; }
            } else { console.warn("API empty response for background messages."); currentMessages = []; }
        } catch (error) { console.error("Failed to fetch background messages:", error); currentMessages = []; }
        finally { isApiFetchingMessages = false; }
    }

    // _getRandomMessage for timed messages
    function _getRandomMessage() {
        if (currentMessages.length > 0) { return currentMessages[Math.floor(Math.random() * currentMessages.length)].replace(/{user}/g, currentUserName); }
        // Fallback logic
        const personaFallbacks = fallbackMessages[currentPersonaInGame] || fallbackMessages.Mika;
        let moodKey = currentMood;
        if (pooIncidentActive) { moodKey = "grumpy"; } // Prioritize grumpy if poo active
        const moodFallbacks = personaFallbacks[moodKey] || personaFallbacks.generic || ["..."];
        return moodFallbacks[Math.floor(Math.random() * moodFallbacks.length)].replace(/{user}/g, currentUserName);
    }

    // Display a specific message in the bubble
    function _displayGotchiMessage(message) {
        if (isNapping || !messageDisplayArea) return;

        console.log(`Displaying Gotchi Msg: ${message}`);
        messageDisplayArea.textContent = message;
        // Determine text color based on persona
        messageDisplayArea.style.color = (currentPersonaInGame === 'Kana') ? 'var(--kana-popup-border, #b39ddb)' : 'var(--mika-message-name, #f06292)';
        messageDisplayArea.style.transition = 'opacity 0.3s ease-in';
        messageDisplayArea.style.opacity = '1';

        if (messageDisplayArea.fadeTimeout) clearTimeout(messageDisplayArea.fadeTimeout);
        if (messageDisplayArea.clearTimeout) clearTimeout(messageDisplayArea.clearTimeout);

        messageDisplayArea.fadeTimeout = setTimeout(() => {
            if (messageDisplayArea) {
                messageDisplayArea.style.transition = 'opacity 1s ease-out';
                messageDisplayArea.style.opacity = '0';
                messageDisplayArea.clearTimeout = setTimeout(() => {
                    if (messageDisplayArea) messageDisplayArea.textContent = '';
                }, 1000);
            }
        }, 4000);
    }

    // Function for the timed message interval
    function _showTimedRandomMessage() {
        if (isGotchiResponding) return;
        const randomMsg = _getRandomMessage();
        _displayGotchiMessage(randomMsg);
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
    // _clearUI clears new chat elements
    function _clearUI() {
        if (gameUiContainer) { gameUiContainer.innerHTML = ''; }
        moodEmojiDisplay = hungerBarFill = happinessBarFill = energyBarFill = affectionBarFill = feedButton = playButton = cleanButton = napButton = headpatButton = messageDisplayArea = dailyTaskButton = characterGraphicContainer = charBody = charEarLeft = charEarRight = charEyeLeft = charEyeRight = charTail = tasksPopupOverlay = tasksPopupContent = tasksPopupCloseButton = tasksPopupStreakDisplay = null;
        pooVisualElement = null; gotchiChatInput = null; gotchiSendButton = null; gotchiChatArea = null;
        if (bounceAnimation) bounceAnimation.cancel(); bounceAnimation = null; if (walkAnimation) walkAnimation.cancel(); walkAnimation = null;
    }

    // _createMainUI final layout adjustments
    function _createMainUI() {
        _clearUI();
        if (!gameUiContainer) return;

        // Base container styles
        gameUiContainer.style.cssText = `width: 100%; height: 100%; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box; align-items: center; position: relative; overflow: hidden;`;

        // --- Top Area Wrapper (Stats + Emoji) ---
        const topArea = document.createElement('div');
        topArea.style.cssText = `width: 100%; max-width: 400px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-shrink: 0; position: relative;`;

        // 1. Stat Bars Area
        const statsArea = document.createElement('div');
        statsArea.classList.add('gotchi-stats-area');
        statsArea.style.cssText = `flex-grow: 1; display: grid; grid-template-columns: auto 1fr; gap: 3px 8px; font-size: 0.8em; margin-right: 45px;`;
        const createBar = (label, id) => {
            const labelNode = document.createElement('span'); labelNode.textContent = label; labelNode.style.textAlign = 'right'; statsArea.appendChild(labelNode);
            const barBg = document.createElement('div'); barBg.style.cssText = `height: 10px; background-color: rgba(0,0,0,0.2); border-radius: 5px; overflow: hidden; border: 1px solid rgba(255,255,255,0.2);`;
            const barFill = document.createElement('div'); barFill.id = id; barFill.style.cssText = `height: 100%; width: 50%; background: linear-gradient(to right, #f06292, #ff8a80); border-radius: 5px 0 0 5px; transition: width 0.5s ease-out;`; barBg.appendChild(barFill); statsArea.appendChild(barBg); return barFill;
        };
        hungerBarFill = createBar('Hunger 🍖:', 'gotchi-hunger-fill'); happinessBarFill = createBar('Happy ✨:', 'gotchi-happiness-fill'); energyBarFill = createBar('Energy ⚡:', 'gotchi-energy-fill'); affectionBarFill = createBar('Affection ♡:', 'gotchi-affection-fill');
        if (hungerBarFill) hungerBarFill.style.background = 'linear-gradient(to right, #ffcc80, #ffab40)'; if (happinessBarFill) happinessBarFill.style.background = 'linear-gradient(to right, #a5d6a7, #66bb6a)'; if (energyBarFill) energyBarFill.style.background = 'linear-gradient(to right, #90caf9, #42a5f5)'; if (affectionBarFill) affectionBarFill.style.background = 'linear-gradient(to right, #f48fb1, #f06292)';
        topArea.appendChild(statsArea);

        // 2. Mood Emoji Display (Top Right)
        moodEmojiDisplay = document.createElement('div');
        moodEmojiDisplay.id = 'gotchi-mood-emoji';
        moodEmojiDisplay.style.cssText = `position: absolute; top: 0px; right: 0px; font-size: 2.5em; text-shadow: 0 0 5px rgba(0,0,0,0.3); z-index: 2; transition: opacity 0.3s; width: 40px; text-align: center;`;
        topArea.appendChild(moodEmojiDisplay);

        gameUiContainer.appendChild(topArea);

        // 3. Character Display Area (Wrapper for graphic and bubble)
        const characterArea = document.createElement('div');
        characterArea.style.cssText = `flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; width: 100%; min-height: 180px;`;
        // Message Display Area (Floating Text) - Positioned within characterArea, above graphic
        messageDisplayArea = document.createElement('div');
        messageDisplayArea.id = 'gotchi-message-display';
        // *** MODIFICATION START: Removed background, adjusted position, color, shadow ***
        messageDisplayArea.style.cssText = `position: absolute; top: 5px; /* Raised slightly more */ left: 50%; transform: translateX(-50%); color: var(--mika-message-name, #f06292); /* Default to Mika pink */ font-weight: bold; padding: 5px; /* Minimal padding */ border-radius: 5px; /* Can keep for potential future use */ font-size: 1em; /* Slightly larger text */ text-align: center; opacity: 0; transition: opacity 0.3s ease-in, color 0.3s ease; z-index: 3; max-width: 90%; white-space: normal; pointer-events: none; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); /* Added shadow for visibility */`;
        characterArea.appendChild(messageDisplayArea);
        // Character Graphic Container - Adjusted margin-top
        characterGraphicContainer = document.createElement('div');
        characterGraphicContainer.id = 'gotchi-graphic-container';
        characterGraphicContainer.style.cssText = `width: 80px; height: 100px; position: relative; margin-top: 45px; /* Adjusted to make space for text */`;
        // *** MODIFICATION END ***
        const colors = (currentPersonaInGame === 'Kana') ? KANA_COLORS : MIKA_COLORS;
        const bodySize = 60; const earSize = 20; const eyeSize = 8; const tailWidth = 8; const tailHeight = 35;
        charBody = document.createElement('div'); charBody.id = 'gotchi-body'; charBody.style.cssText = `position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: ${bodySize}px; height: ${bodySize}px; background-color: ${colors.body}; border-radius: 10px; border: 1px solid ${colors.accent};`; characterGraphicContainer.appendChild(charBody);
        charEarLeft = document.createElement('div'); charEarLeft.id = 'gotchi-ear-left'; charEarLeft.style.cssText = `position: absolute; top: -${earSize * 0.8}px; left: ${bodySize * 0.1}px; width: 0; height: 0; border-left: ${earSize / 2}px solid transparent; border-right: ${earSize / 2}px solid transparent; border-bottom: ${earSize}px solid ${colors.accent};`; charBody.appendChild(charEarLeft);
        charEarRight = document.createElement('div'); charEarRight.id = 'gotchi-ear-right'; charEarRight.style.cssText = `position: absolute; top: -${earSize * 0.8}px; right: ${bodySize * 0.1}px; width: 0; height: 0; border-left: ${earSize / 2}px solid transparent; border-right: ${earSize / 2}px solid transparent; border-bottom: ${earSize}px solid ${colors.accent};`; charBody.appendChild(charEarRight);
        charEyeLeft = document.createElement('div'); charEyeLeft.id = 'gotchi-eye-left'; charEyeLeft.style.cssText = `position: absolute; top: ${bodySize * 0.3}px; left: ${bodySize * 0.25}px; width: ${eyeSize}px; height: ${eyeSize}px; background-color: ${colors.eyes}; border-radius: 50%; transition: all 0.2s ease;`; charBody.appendChild(charEyeLeft);
        charEyeRight = document.createElement('div'); charEyeRight.id = 'gotchi-eye-right'; charEyeRight.style.cssText = `position: absolute; top: ${bodySize * 0.3}px; right: ${bodySize * 0.25}px; width: ${eyeSize}px; height: ${eyeSize}px; background-color: ${colors.eyes}; border-radius: 50%; transition: all 0.2s ease;`; charBody.appendChild(charEyeRight);
        charTail = document.createElement('div'); charTail.id = 'gotchi-tail'; charTail.style.cssText = `position: absolute; bottom: ${bodySize * 0.1}px; left: -${tailWidth * 1.5}px; width: ${tailWidth}px; height: ${tailHeight}px; border-radius: 4px 4px 10px 10px / 50px 50px 10px 10px; background-color: ${colors.accent}; transform-origin: bottom right; animation: tail-sway 2s ease-in-out infinite alternate;`;
        const tailSwayKeyframes = [{ transform: 'rotate(-10deg)' }, { transform: 'rotate(10deg)' }]; charTail.animate(tailSwayKeyframes, { duration: 1500 + Math.random() * 500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }); charBody.appendChild(charTail);
        if (!document.getElementById('gotchi-animations')) { const styleSheet = document.createElement("style"); styleSheet.id = 'gotchi-animations'; styleSheet.innerText = `@keyframes tail-sway { 0% { transform: rotate(-10deg); } 100% { transform: rotate(10deg); } } @keyframes walk-left-right { 0%, 100% { transform: translateX(-15px); } 50% { transform: translateX(15px); } }`; document.head.appendChild(styleSheet); }
        bounceAnimation = characterGraphicContainer.animate([{ transform: 'translateY(0px)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0px)' }], { duration: 900 + Math.random() * 200, iterations: Infinity, easing: 'ease-in-out' });
        walkAnimation = characterGraphicContainer.animate([ { marginLeft: '-15px' }, { marginLeft: '15px' } ], { duration: 3000 + Math.random()*1000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
        characterArea.appendChild(characterGraphicContainer);
        // Poo Visual Element
        pooVisualElement = document.createElement('div');
        pooVisualElement.id = 'gotchi-poo-visual'; pooVisualElement.textContent = '💩';
        pooVisualElement.style.cssText = `position: absolute; bottom: 5px; left: 60%; font-size: 1.8em; opacity: 0; transition: opacity 0.5s ease-in-out; z-index: 1; text-shadow: 1px 1px 2px rgba(0,0,0,0.4); cursor: default;`;
        characterArea.appendChild(pooVisualElement);
        gameUiContainer.appendChild(characterArea);

        // 4. Command Buttons Area
        const commandsArea = document.createElement('div');
        commandsArea.style.cssText = `display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 10px 0; margin-bottom: 5px; flex-shrink: 0; width: 100%; max-width: 450px;`;
        const createButton = (text, id, handler, icon) => {
            const button = document.createElement('button'); button.id = id; button.className = 'rps-choice-button'; button.style.fontSize = '0.9em'; button.style.padding = '8px 12px'; button.innerHTML = `${icon ? icon + ' ' : ''}${text}`; button.onclick = handler; commandsArea.appendChild(button); return button;
        };
        feedButton = createButton('Feed', 'gotchi-feed-btn', _handleFeed, '🍖'); playButton = createButton('Play', 'gotchi-play-btn', _handlePlay, '🧶'); cleanButton = createButton('Clean', 'gotchi-clean-btn', _handleClean, '✨'); napButton = createButton('Nap', 'gotchi-nap-btn', _handleNapToggle, '💤'); headpatButton = createButton('Headpat', 'gotchi-headpat-btn', _handleHeadpat, '♡');
        gameUiContainer.appendChild(commandsArea);

        // 5. Direct Chat Input Area
        gotchiChatArea = document.createElement('div');
        gotchiChatArea.id = 'gotchi-chat-input-area';
        gotchiChatArea.style.cssText = `display: flex; align-items: center; width: 100%; max-width: 350px; padding: 5px; box-sizing: border-box; flex-shrink: 0; margin-bottom: 10px;`;
        gotchiChatInput = document.createElement('input');
        gotchiChatInput.type = 'text'; gotchiChatInput.id = 'gotchi-chat-input'; gotchiChatInput.placeholder = 'Talk to me... ♡';
        gotchiChatInput.style.cssText = `flex-grow: 1; padding: 8px 12px; border: 1px solid var(--chat-input-border); background-color: var(--chat-input-bg); color: var(--chat-input-text); border-radius: 15px 0 0 15px; font-family: inherit; font-size: 0.95em; outline: none; transition: all 0.2s ease;`;
        gotchiChatInput.onkeypress = (e) => { if (e.key === 'Enter' && !isGotchiResponding && !isNapping) { e.preventDefault(); _handleUserChat(); } };
        gotchiSendButton = document.createElement('button');
        gotchiSendButton.id = 'gotchi-send-button'; gotchiSendButton.textContent = 'Send';
        gotchiSendButton.style.cssText = `padding: 8px 15px; border: 1px solid var(--chat-input-border); border-left: none; background: linear-gradient(45deg, var(--send-button-bg-1), var(--send-button-bg-2)); color: white; font-weight: bold; cursor: pointer; border-radius: 0 15px 15px 0; transition: background 0.2s; font-size: 0.95em;`;
        gotchiSendButton.onclick = _handleUserChat;
        gotchiChatArea.appendChild(gotchiChatInput); gotchiChatArea.appendChild(gotchiSendButton);
        gameUiContainer.appendChild(gotchiChatArea);

        // 6. Daily Task Button (Positioned absolutely, bottom-right, above chat)
        dailyTaskButton = document.createElement('button');
        dailyTaskButton.id = 'gotchi-daily-tasks'; dailyTaskButton.textContent = `Daily (X/Y)`;
        dailyTaskButton.className = 'rps-choice-button secondary';
        dailyTaskButton.style.cssText = `font-size: 0.8em; position: absolute; bottom: 65px; /* Adjusted */ right: 10px; padding: 4px 8px; z-index: 5;`;
        dailyTaskButton.onclick = _showDailyTasksPopup;
        gameUiContainer.appendChild(dailyTaskButton);

        // Create Daily Tasks Popup
        _createTasksPopup();

        // Ensure Gotchi CSS is present
         if (!document.getElementById('gotchi-styles')) {
             const styleSheet = document.createElement("style"); styleSheet.id = 'gotchi-styles';
             styleSheet.innerText = `.gotchi-stats-area { color: var(--chat-log-text, #ffe0f0); }`;
             document.head.appendChild(styleSheet);
         }

        // Final Setup
        _updateStatBars(); _calculateMoodAndEmoji(); _updateCharacterVisuals(); _updateCommandButtons(); _updateDailyTaskDisplay();
        _updatePooVisual();
        _updateChatInputState();
    }

    // Create Tasks Popup
    function _createTasksPopup() {
        let existingPopup = document.getElementById('gotchi-tasks-popup-overlay');
        if (existingPopup) { tasksPopupOverlay = existingPopup; tasksPopupContent = document.getElementById('gotchi-tasks-popup-content'); tasksPopupCloseButton = tasksPopupOverlay.querySelector('.popup-button'); tasksPopupStreakDisplay = document.getElementById('gotchi-tasks-popup-streak'); tasksPopupOverlay.style.display = 'none'; console.log("Reusing existing tasks popup."); return; }
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
        const playState = isNapping ? 'paused' : 'running';
        if (bounceAnimation && bounceAnimation.playState !== playState) { isNapping ? bounceAnimation.pause() : bounceAnimation.play(); }
        if (walkAnimation && walkAnimation.playState !== playState) { isNapping ? walkAnimation.pause() : walkAnimation.play(); }
        // Update message text color based on persona too
        if (messageDisplayArea) {
           messageDisplayArea.style.color = (currentPersonaInGame === 'Kana') ? 'var(--kana-popup-border, #b39ddb)' : 'var(--mika-message-name, #f06292)';
        }
    }

    // _updateCommandButtons disables based on nap/poo/responding
    function _updateCommandButtons() {
        const disableMostButtons = isNapping || pooIncidentActive || isGotchiResponding;

        if (feedButton) feedButton.disabled = disableMostButtons || hunger > 85;
        if (playButton) playButton.disabled = disableMostButtons || energy < 20 || happiness > 90;
        if (cleanButton) cleanButton.disabled = isNapping || isGotchiResponding;
        if (napButton) { napButton.innerHTML = isNapping ? '☀️ Wake Up!' : '💤 Nap'; napButton.disabled = pooIncidentActive || isGotchiResponding || (!isNapping && energy > 90); }
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
        if (!tasksPopupOverlay || !tasksPopupContent || !tasksPopupStreakDisplay) { /* ... recreate if needed ... */ }
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

    // Function to enable/disable chat input
    function _updateChatInputState() {
        const disable = isNapping || isGotchiResponding;
        if (gotchiChatInput) {
            gotchiChatInput.disabled = disable;
            gotchiChatInput.placeholder = isNapping ? 'Zzzz...' : (isGotchiResponding ? 'Thinking...' : (currentPersonaInGame === 'Kana' ? 'What.' : 'Talk to me... ♡'));
        }
        if (gotchiSendButton) {
            gotchiSendButton.disabled = disable;
        }
    }

    // --- Event Handlers ---
    // Action handlers don't call message display directly
    function _handleFeed() {
        if (isNapping || pooIncidentActive || isGotchiResponding || hunger > 85) return;
        hunger = _clampStat(hunger + FEED_HUNGER_GAIN); happiness = _clampStat(happiness + FEED_HAPPINESS_GAIN);
        if (!dailyTasks.fed_check) affection = _clampStat(affection + 5);
        dailyTasks.fed_check = true; lastMemory = "fed_well";
        _updateStats(); _saveState();
        if (hunger >= HUNGER_THRESHOLD && lowHungerNotified) { lowHungerNotified = false; }
    }
    function _handlePlay() {
        if (isNapping || pooIncidentActive || isGotchiResponding || energy < 20 || happiness > 90) return;
        happiness = _clampStat(happiness + PLAY_HAPPINESS_GAIN); energy = _clampStat(energy - PLAY_ENERGY_LOSS);
        if (!dailyTasks.played_check) affection = _clampStat(affection + DAILY_TASK_AFFECTION_GAIN / 2);
        dailyTasks.played_check = true; lastMemory = "played_with";
        _updateStats(); _saveState();
        if (happiness >= HAPPINESS_THRESHOLD && lowHappinessNotified) { lowHappinessNotified = false; }
        if (energy >= ENERGY_THRESHOLD && lowEnergyNotified) { lowEnergyNotified = false; }
    }
    function _handleNapToggle() { // Waking up IS an important event
        if (pooIncidentActive || isGotchiResponding) return;
        isNapping = !isNapping;
        if (isNapping) {
            if (messagePopupIntervalId) clearInterval(messagePopupIntervalId); messagePopupIntervalId = null;
            _stopMusic();
            if(messageDisplayArea) {
                 if(messageDisplayArea.fadeTimeout) clearTimeout(messageDisplayArea.fadeTimeout);
                 if (messageDisplayArea.clearTimeout) clearTimeout(messageDisplayArea.clearTimeout);
                 messageDisplayArea.style.transition = 'none'; messageDisplayArea.style.opacity = '0';
                 messageDisplayArea.textContent = ''; // Clear text on nap start
            }
        } else {
            if (!messagePopupIntervalId) messagePopupIntervalId = setInterval(_showTimedRandomMessage, MESSAGE_POPUP_INTERVAL_MS);
            _updateMusic(); lastMemory = "woke_up";
            _fetchNewMessages(); // Fetch messages on wake-up
            setTimeout(() => _displayGotchiMessage(_getRandomMessage()), 500); // <<< Display wake-up message
            if (energy >= ENERGY_THRESHOLD && lowEnergyNotified) { lowEnergyNotified = false; } // Reset flag if recovered
        }
        lastUpdateTime = Date.now(); _updateCharacterVisuals(); _updateCommandButtons(); _saveState();
        _updateChatInputState(); // Update chat input based on nap state
        console.log("Nap toggled:", isNapping);
    }
    function _handleHeadpat() {
        if (isNapping || pooIncidentActive || isGotchiResponding || affection > 95) return;
        happiness = _clampStat(happiness + HEADPAT_HAPPINESS_GAIN); affection = _clampStat(affection + HEADPAT_AFFECTION_GAIN);
        if (!dailyTasks.greeted) affection = _clampStat(affection + 5);
        dailyTasks.greeted = true; lastMemory = "got_headpats";
        _updateStats(); _saveState();
        // Visual feedback for headpat
        if (moodEmojiDisplay) moodEmojiDisplay.textContent = '💖';
        if (characterGraphicContainer) characterGraphicContainer.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
        setTimeout(() => _updateCharacterVisuals(), 400);
        if (happiness >= HAPPINESS_THRESHOLD && lowHappinessNotified) { lowHappinessNotified = false; }
    }
    // _handleClean triggers important message AFTER poo cleanup
    function _handleClean() {
        if (isNapping || isGotchiResponding) return; // Cannot clean if responding

        if (pooIncidentActive) {
            // Poo cleanup logic
            console.log("Cleaning up poo incident!");
            pooIncidentActive = false; blamedPersona = null;
            happiness = _clampStat(happiness + CLEAN_POO_HAPPINESS_GAIN);
            affection = _clampStat(affection + CLEAN_POO_AFFECTION_GAIN);
            lastMemory = "cleaned_up_mess";
            if (!dailyTasks.tidied) affection = _clampStat(affection + 3);
            dailyTasks.tidied = true;
            _updatePooVisual();
            _updateStats();
            _saveState();
            _showSimpleConfirmation(`Thank you for cleaning that up, ${currentUserName}! ${currentPersonaInGame === 'Mika' ? '*Phew!* Must have been Kana...' : '*Hmph*. Finally.'} `);
            _fetchNewMessages(true); // Fetch normal messages now
            setTimeout(() => _displayGotchiMessage(_getRandomMessage()), 500); // <<< Display a message after cleaning
            _updateDailyTaskDisplay();
            // Reset notification flags if relevant stats recovered
            if (happiness >= HAPPINESS_THRESHOLD && lowHappinessNotified) { lowHappinessNotified = false; }
        } else {
            // Normal cleaning
            happiness = _clampStat(happiness + CLEAN_HAPPINESS_GAIN);
            if (!dailyTasks.tidied) affection = _clampStat(affection + 3);
            dailyTasks.tidied = true;
            lastMemory = "cleaned_space";
            _updateStats();
            _saveState();
            _updateDailyTaskDisplay();
            if (happiness >= HAPPINESS_THRESHOLD && lowHappinessNotified) { lowHappinessNotified = false; }
        }
        _updateChatInputState(); // Re-enable buttons potentially disabled by poo
    }

    // Handler for direct user chat input
    async function _handleUserChat() {
        if (isNapping || isGotchiResponding || !gotchiChatInput || !gotchiChatInput.value.trim()) {
            return;
        }
        if (!apiCaller) {
             _displayGotchiMessage("Mrow! My chat magic isn't working!");
             return;
        }

        const userText = gotchiChatInput.value.trim();
        gotchiChatInput.value = '';
        isGotchiResponding = true;
        _updateChatInputState(); // Disable input & buttons
        _updateCommandButtons(); // Update command buttons too

        // Pause timed messages while responding
        if (messagePopupIntervalId) clearInterval(messagePopupIntervalId);
        messagePopupIntervalId = null;

        // Construct prompt for API
        const personaDesc = currentPersonaInGame === 'Mika' ? `You are Mika: bubbly, playful, possessive, energetic catgirl.` : `You are Kana: sarcastic, grumpy, aloof, witty catgirl.`;
        let pooContext = ""; if (pooIncidentActive && blamedPersona) { pooContext = ` IMPORTANTLY, there is currently a mess (💩) that you are blaming on ${blamedPersona}. Keep acting innocent and maybe subtly work the blame into your response if relevant.`; }
        const stateSummary = `My current state: Mood=${currentMood}, Hunger=${hunger.toFixed(0)}/100, Happiness=${happiness.toFixed(0)}/100, Energy=${energy.toFixed(0)}/100.${pooContext}`;
        const prompt = `[ROLE: You are the Gotchi character ${currentPersonaInGame} (${personaDesc}). ${stateSummary}] The user (${currentUserName}) just said to you: "${userText}" Respond directly to the user's message in character, keeping your current state/situation in mind. Keep your response short and suitable for a small thought bubble (1-2 sentences max). Just output the response text.`;

        try {
            const response = await apiCaller(prompt, []);
            if (response) { _displayGotchiMessage(response); }
            else { _displayGotchiMessage(currentPersonaInGame === 'Kana' ? '...' : '*confused meow*'); }
        } catch (error) { console.error("Error getting Gotchi chat response:", error); _displayGotchiMessage(currentPersonaInGame === 'Kana' ? 'Error.' : 'Mrow?'); }
        finally {
            isGotchiResponding = false; _updateChatInputState(); _updateCommandButtons();
            if (!isNapping) { // Restart timed messages
                if (messagePopupIntervalId) clearInterval(messagePopupIntervalId);
                messagePopupIntervalId = setInterval(_showTimedRandomMessage, MESSAGE_POPUP_INTERVAL_MS);
            }
        }
    }

    // --- Initialization and Exit ---
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
         console.log(`Initializing MikaGotchi (v1.5.5 Bubble Fix 2) for ${userName}, Persona: ${persona}`); // Updated log
         gameUiContainer = _gameUiContainer; messageCallback = _messageCallback; apiCaller = _apiCaller;
         currentUserName = userName || "User"; currentPersonaInGame = persona || 'Mika';
         isApiFetchingMessages = false; currentMessages = [];
         pooIncidentActive = false; blamedPersona = null;
         lowHungerNotified = false; lowHappinessNotified = false; lowEnergyNotified = false;
         isGotchiResponding = false;
         if (!gameUiContainer) { console.error("Gotchi UI container missing!"); if(messageCallback) messageCallback('System', 'Error: Gotchi UI container missing!'); return; }
         if (gameLoopIntervalId) clearInterval(gameLoopIntervalId); if (messagePopupIntervalId) clearInterval(messagePopupIntervalId);
         _loadState();
         _handleDailyReset();
         _createMainUI(); // Creates UI with adjusted layout
         gameLoopIntervalId = setInterval(_updateStats, UPDATE_INTERVAL_MS);
         if (!isNapping) { // Setup timed messages
             messagePopupIntervalId = setInterval(_showTimedRandomMessage, MESSAGE_POPUP_INTERVAL_MS);
             setTimeout(_showTimedRandomMessage, 1500);
         }
         // Initial fetch if needed
         if (!pooIncidentActive && !lowHungerNotified && !lowHappinessNotified && !lowEnergyNotified && !isApiFetchingMessages) { _fetchNewMessages(true); }
         _updateMusic();
         console.log(`MikaGotchi initialized. Mood: ${currentMood}, Napping: ${isNapping}, Poo Active: ${pooIncidentActive}.`);
     }

    function onExit() {
        console.log("MikaGotchi onExit called.");
        if (gameLoopIntervalId) { clearInterval(gameLoopIntervalId); gameLoopIntervalId = null; }
        if (messagePopupIntervalId) { clearInterval(messagePopupIntervalId); messagePopupIntervalId = null; }
        if (messageDisplayArea && messageDisplayArea.fadeTimeout) { clearTimeout(messageDisplayArea.fadeTimeout); }
        if (messageDisplayArea && messageDisplayArea.clearTimeout) clearTimeout(messageDisplayArea.clearTimeout); // Clear this too
        const containerRef = gameUiContainer;
        _stopMusic();
        _saveState();
        let popup = document.getElementById('gotchi-tasks-popup-overlay'); if (popup?.parentNode === document.body) { document.body.removeChild(popup); } tasksPopupOverlay = null;
        _clearUI();
        console.log("MikaGotchi cleanup complete."); return Promise.resolve(true);
    }

    // _showSimpleConfirmation
    function _showSimpleConfirmation(message) {
        if (!gameUiContainer) { console.warn("Cannot show confirmation, UI container missing."); return; }
        const existingConfirmationArea = document.getElementById('gotchi-confirmation');
        let confirmationArea = existingConfirmationArea;
        if (!confirmationArea || !confirmationArea.parentNode) {
            confirmationArea = document.createElement('div');
            confirmationArea.id = 'gotchi-confirmation';
            confirmationArea.style.cssText = `
                position: absolute; top: 60px; /* Adjust if needed based on emoji position */ left: 50%; transform: translateX(-50%);
                background-color: rgba(0, 150, 136, 0.85); /* Teal */ color: white;
                padding: 8px 15px; border-radius: 10px; font-size: 0.9em; text-align: center;
                opacity: 0; transition: opacity 0.5s ease-in-out; z-index: 4; max-width: 80%;
                pointer-events: none;
            `;
            gameUiContainer.appendChild(confirmationArea);
        }
        if (confirmationArea.fadeTimeout) clearTimeout(confirmationArea.fadeTimeout);
        if (confirmationArea.clearTimeout) clearTimeout(confirmationArea.clearTimeout);
        confirmationArea.textContent = message;
        confirmationArea.style.opacity = '1';
        confirmationArea.fadeTimeout = setTimeout(() => {
            if (confirmationArea) { confirmationArea.style.opacity = '0'; }
        }, 2500);
    }

    // --- Public Interface ---
    return {
        init: init,
        onExit: onExit
    };

})();

// --- END OF FILE gotchi.js ---