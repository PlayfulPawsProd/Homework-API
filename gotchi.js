// --- START OF FILE gotchi.js ---

// Nyaa~! Mika-Gotchi (and... Kana-Gotchi?) - Take Care of Me, {user}! ♡
// Version 1.3.3 - Class-Based Background Fix & UI Tweaks

const MikaGotchi = (() => {
    // --- Settings & Constants ---
    const STORAGE_KEY = 'mikaGotchiData_v1';
    const UPDATE_INTERVAL_MS = 5000; // How often stats decay (e.g., 5 seconds)
    const MESSAGE_POPUP_INTERVAL_MS = 45000; // How often random messages appear (e.g., 45 seconds)
    const API_MESSAGE_BATCH_SIZE = 7; // How many messages to request from API
    const MAX_STAT_VALUE = 100;
    const MIN_STAT_VALUE = 0;

    // Stat decay/gain rates
    const HUNGER_DECAY_RATE = 1; const HAPPINESS_DECAY_RATE = 1; const ENERGY_DECAY_RATE = 0.5; const AFFECTION_DECAY_RATE = 0.2;
    const FEED_HUNGER_GAIN = 30; const FEED_HAPPINESS_GAIN = 5; const PLAY_HAPPINESS_GAIN = 25; const PLAY_ENERGY_LOSS = 15;
    const NAP_ENERGY_GAIN_RATE = 5; const NAP_HAPPINESS_LOSS = 1; const HEADPAT_HAPPINESS_GAIN = 10; const HEADPAT_AFFECTION_GAIN = 15;
    const CLEAN_HAPPINESS_GAIN = 5; const DAILY_TASK_AFFECTION_GAIN = 10;

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
    let bounceAnimation = null;
    let walkAnimation = null;
    let tasksPopupOverlay = null;
    let tasksPopupContent = null;
    let tasksPopupCloseButton = null;
    let tasksPopupStreakDisplay = null;

    // --- Helper Functions ---
    function _getCurrentTimestamp() { return Date.now(); }
    function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }
    function _clampStat(value) { return Math.max(MIN_STAT_VALUE, Math.min(MAX_STAT_VALUE, value)); }

    // --- Persistence ---
    function _saveState() {
        const state = { hunger, happiness, energy, affection, lastMemory, dailyTasks, dailyStreak, lastCheckinDay, lastUpdateTime, isNapping };
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
                console.log(`Gotchi state loaded for ${currentPersonaInGame}`);
                const now = _getCurrentTimestamp(); const secondsSinceLastSave = (now - lastUpdateTime) / 1000;
                if (secondsSinceLastSave > 0) {
                    console.log(`Calculating decay for ${secondsSinceLastSave.toFixed(0)}s since last save.`);
                    const intervalsToSimulate = secondsSinceLastSave / (UPDATE_INTERVAL_MS / 1000);
                    if (isNapping) {
                        energy = _clampStat(energy + NAP_ENERGY_GAIN_RATE * intervalsToSimulate); happiness = _clampStat(happiness - NAP_HAPPINESS_LOSS * intervalsToSimulate); hunger = _clampStat(hunger - (HUNGER_DECAY_RATE / 2) * intervalsToSimulate);
                        if (energy >= MAX_STAT_VALUE) isNapping = false;
                    } else {
                        hunger = _clampStat(hunger - HUNGER_DECAY_RATE * intervalsToSimulate); happiness = _clampStat(happiness - HAPPINESS_DECAY_RATE * intervalsToSimulate); energy = _clampStat(energy - ENERGY_DECAY_RATE * intervalsToSimulate); affection = _clampStat(affection - AFFECTION_DECAY_RATE * intervalsToSimulate);
                    }
                    lastUpdateTime = now; console.log(`Simulated decay complete. New stats: H:${hunger.toFixed(0)}, Hap:${happiness.toFixed(0)}, E:${energy.toFixed(0)}, Aff:${affection.toFixed(0)}`);
                } return true;
            }
        } catch (e) { console.error("Failed to load Gotchi state:", e); localStorage.removeItem(STORAGE_KEY + `_${currentPersonaInGame}`); }
        lastUpdateTime = Date.now(); lastCheckinDay = _getCurrentDateString(); console.log(`No saved state found for ${currentPersonaInGame}, using defaults.`); return false;
    }


    // --- Core Game Logic ---
    function _updateStats() {
        const now = _getCurrentTimestamp(); const elapsedSeconds = (now - lastUpdateTime) / 1000; const intervalsPassed = elapsedSeconds / (UPDATE_INTERVAL_MS / 1000);
        if (intervalsPassed < 0.1) return;
        if (isNapping) {
            energy = _clampStat(energy + NAP_ENERGY_GAIN_RATE * intervalsPassed); happiness = _clampStat(happiness - NAP_HAPPINESS_LOSS * intervalsPassed); hunger = _clampStat(hunger - (HUNGER_DECAY_RATE / 2) * intervalsPassed);
            if (energy >= MAX_STAT_VALUE) { _handleNapToggle(); }
        } else {
            hunger = _clampStat(hunger - HUNGER_DECAY_RATE * intervalsPassed); happiness = _clampStat(happiness - HAPPINESS_DECAY_RATE * intervalsPassed); energy = _clampStat(energy - ENERGY_DECAY_RATE * intervalsPassed); affection = _clampStat(affection - AFFECTION_DECAY_RATE * intervalsPassed);
        }
        lastUpdateTime = now; _updateStatBars(); _calculateMoodAndEmoji(); _updateCharacterVisuals(); _updateCommandButtons();
        if (!isNapping) {
             if (hunger < 20) currentMood = "hungry"; else if (happiness < 30) currentMood = "grumpy"; else if (energy < 25) currentMood = "sleepy";
             else if (happiness > 80 && energy > 60) currentMood = "playful"; else if (happiness > 70 && affection > 70) currentMood = "happy"; else currentMood = "content";
        }
    }

    function _calculateMoodAndEmoji() {
        let calculatedMood = "content"; let emoji = "😊"; if (currentPersonaInGame === 'Kana') emoji = "😑";
        if (isNapping) { calculatedMood = "sleepy"; emoji = "😴"; }
        else if (hunger < 25) { calculatedMood = "hungry"; emoji = currentPersonaInGame === 'Mika' ? "🥺" : "😠"; }
        else if (happiness < 35) { calculatedMood = "grumpy"; emoji = currentPersonaInGame === 'Mika' ? "😠" : "💢"; }
        else if (affection < 40 && happiness < 50) { calculatedMood = "needy"; emoji = currentPersonaInGame === 'Mika' ? "🥺" : "😒"; }
        else if (energy < 30) { calculatedMood = "sleepy"; emoji = currentPersonaInGame === 'Mika' ? "🥱" : "😩"; }
        else if (happiness > 80 && energy > 60) { calculatedMood = "playful"; emoji = currentPersonaInGame === 'Mika' ? "🥳" : "😼"; }
        else if (happiness > 70 && affection > 70) { calculatedMood = "happy"; emoji = currentPersonaInGame === 'Mika' ? "💖" : "😌"; }
        if (currentMood !== calculatedMood || currentMoodEmoji !== emoji) {
            currentMood = calculatedMood; currentMoodEmoji = emoji;
            if (!isApiFetchingMessages && calculatedMood !== "content" && calculatedMood !== "happy") { console.log("Mood change, fetching messages."); _fetchNewMessages(); }
        }
    }

    function _handleDailyReset() {
        const today = _getCurrentDateString();
        if (lastCheckinDay && lastCheckinDay !== today) {
            console.log(`Daily Reset Triggered. Last: ${lastCheckinDay}, Today: ${today}`);
            if (hunger < 30) { lastMemory = "neglected_hunger"; } else if (happiness < 40) { lastMemory = "neglected_happiness"; } else if (affection < 50) { lastMemory = "neglected_affection"; } else if (dailyTasks.fed_check && dailyTasks.played_check && dailyTasks.greeted) { lastMemory = "cared_for_well"; } else { lastMemory = "neutral"; }
            const allTasksDoneYesterday = Object.values(dailyTasks).every(status => status);
            if (allTasksDoneYesterday) { dailyStreak++; affection = _clampStat(affection + 5); happiness = _clampStat(happiness + 5); } else { dailyStreak = 0; }
            dailyTasks = { greeted: false, fed_check: false, played_check: false, checked_in: false, tidied: false }; lastCheckinDay = today; _saveState(); _fetchNewMessages(true); _displayRandomMessage();
        } else if (!lastCheckinDay) { lastCheckinDay = today; lastMemory = "first_meeting"; _saveState(); _fetchNewMessages(true); console.log("First time check-in."); }
        _updateDailyTaskDisplay();
    }

    // --- API & Message Handling ---
    async function _fetchNewMessages(forceRefresh = false) {
        if (!apiCaller || (isApiFetchingMessages && !forceRefresh)) return;
        isApiFetchingMessages = true; console.log(`Fetching messages for ${currentPersonaInGame}. Mood: ${currentMood}, Mem: ${lastMemory}`);
        const personaDesc = currentPersonaInGame === 'Mika' ? `You are Mika: bubbly, playful, possessive, energetic catgirl.` : `You are Kana: sarcastic, grumpy, aloof, witty catgirl.`;
        const prompt = `[ROLE: Generate ${API_MESSAGE_BATCH_SIZE} short, random messages for a Tamagotchi-like character.] Character: ${currentPersonaInGame} (${personaDesc}) Interacting with: ${currentUserName} Current State: Mood: ${currentMood}, Hunger: ${hunger.toFixed(0)}/100, Happiness: ${happiness.toFixed(0)}/100, Energy: ${energy.toFixed(0)}/100, Affection towards ${currentUserName}: ${affection.toFixed(0)}/100, Memory from yesterday: ${lastMemory}, Napping: ${isNapping}. Instructions: Generate a list of ${API_MESSAGE_BATCH_SIZE} distinct, short (5-15 words) messages that ${currentPersonaInGame} might say randomly, reflecting their personality and current state/memory. Address ${currentUserName} directly. Format as a simple numbered list. Output ONLY the list.`;
        try {
            const response = await apiCaller(prompt, []);
            if (response) {
                const lines = response.split('\n'); const newMessages = lines.map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(line => line.length > 1 && line.length < 100);
                if (newMessages.length > 0) { currentMessages = newMessages; console.log(`Fetched ${currentMessages.length} messages.`); } else { console.warn("API returned no valid messages."); }
            } else { console.warn("API empty response for messages."); currentMessages = []; }
        } catch (error) { console.error("Failed to fetch messages:", error); currentMessages = []; }
        finally { isApiFetchingMessages = false; }
    }

    function _getRandomMessage() {
        if (currentMessages.length > 0) { return currentMessages[Math.floor(Math.random() * currentMessages.length)].replace(/{user}/g, currentUserName); }
        const personaFallbacks = fallbackMessages[currentPersonaInGame] || fallbackMessages.Mika; const moodFallbacks = personaFallbacks[currentMood] || personaFallbacks.generic || ["..."];
        return moodFallbacks[Math.floor(Math.random() * moodFallbacks.length)].replace(/{user}/g, currentUserName);
    }

    function _displayRandomMessage() {
        if (isNapping || !messageDisplayArea) return;
        const message = _getRandomMessage(); console.log("Displaying message:", message);
        messageDisplayArea.textContent = message; messageDisplayArea.style.transition = 'opacity 0.3s ease-in'; messageDisplayArea.style.opacity = '1';
        if (messageDisplayArea.fadeTimeout) clearTimeout(messageDisplayArea.fadeTimeout);
        messageDisplayArea.fadeTimeout = setTimeout(() => { if (messageDisplayArea) { messageDisplayArea.style.transition = 'opacity 1s ease-out'; messageDisplayArea.style.opacity = '0'; } }, 4000);
        if (currentMessages.length < 2 && !isApiFetchingMessages) { _fetchNewMessages(); }
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
    function _clearUI() {
        if (gameUiContainer) gameUiContainer.innerHTML = '';
        moodEmojiDisplay = hungerBarFill = happinessBarFill = energyBarFill = affectionBarFill = feedButton = playButton = cleanButton = napButton = headpatButton = messageDisplayArea = dailyTaskButton = characterGraphicContainer = charBody = charEarLeft = charEarRight = charEyeLeft = charEyeRight = charTail = tasksPopupOverlay = tasksPopupContent = tasksPopupCloseButton = tasksPopupStreakDisplay = null;
        if (bounceAnimation) bounceAnimation.cancel(); bounceAnimation = null;
        if (walkAnimation) walkAnimation.cancel(); walkAnimation = null;
        // Remove the class from app-area if it's still the gameUiContainer
        if(gameUiContainer) {
             gameUiContainer.classList.remove('gotchi-mika-active', 'gotchi-kana-active');
        }
    }

    function _createMainUI() {
        _clearUI();
        if (!gameUiContainer) return;

        // Add class to container instead of inline style for background
        const backgroundClass = (currentPersonaInGame === 'Kana') ? 'gotchi-kana-active' : 'gotchi-mika-active';
        gameUiContainer.classList.remove('gotchi-mika-active', 'gotchi-kana-active'); // Clear previous
        gameUiContainer.classList.add(backgroundClass);

        // Remove inline background style if present (belt-and-suspenders)
        gameUiContainer.style.background = '';

        // Base container styles (background handled by class now)
        gameUiContainer.style.cssText = `width: 100%; height: 100%; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box; align-items: center; position: relative; overflow: hidden;`;

        // 1. Stat Bars Area - Added class for text color control via CSS
        const statsArea = document.createElement('div');
        statsArea.classList.add('gotchi-stats-area'); // Add class here
        statsArea.style.cssText = `width: 90%; max-width: 400px; display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; margin-bottom: 15px; font-size: 0.8em; /* color set by CSS rule */ flex-shrink: 0;`;
        const createBar = (label, id) => { const labelNode = document.createElement('span'); labelNode.textContent = label; labelNode.style.textAlign = 'right'; statsArea.appendChild(labelNode); const barBg = document.createElement('div'); barBg.style.cssText = `height: 12px; background-color: rgba(0,0,0,0.2); border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.2);`; const barFill = document.createElement('div'); barFill.id = id; barFill.style.cssText = `height: 100%; width: 50%; background: linear-gradient(to right, #f06292, #ff8a80); border-radius: 6px 0 0 6px; transition: width 0.5s ease-out;`; barBg.appendChild(barFill); statsArea.appendChild(barBg); return barFill; };
        hungerBarFill = createBar('Hunger 🍖:', 'gotchi-hunger-fill'); happinessBarFill = createBar('Happy ✨:', 'gotchi-happiness-fill'); energyBarFill = createBar('Energy ⚡:', 'gotchi-energy-fill'); affectionBarFill = createBar('Affection ♡:', 'gotchi-affection-fill');
        if (hungerBarFill) hungerBarFill.style.background = 'linear-gradient(to right, #ffcc80, #ffab40)'; if (happinessBarFill) happinessBarFill.style.background = 'linear-gradient(to right, #a5d6a7, #66bb6a)'; if (energyBarFill) energyBarFill.style.background = 'linear-gradient(to right, #90caf9, #42a5f5)'; if (affectionBarFill) affectionBarFill.style.background = 'linear-gradient(to right, #f48fb1, #f06292)';
        gameUiContainer.appendChild(statsArea);

        // 2. Character Display Area (Graphics code remains the same)
        const characterArea = document.createElement('div');
        characterArea.style.cssText = `flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; width: 100%; min-height: 150px;`;
        moodEmojiDisplay = document.createElement('div'); moodEmojiDisplay.id = 'gotchi-mood-emoji'; moodEmojiDisplay.style.cssText = `position: absolute; top: -5px; font-size: 2.5em; text-shadow: 0 0 5px rgba(0,0,0,0.3); z-index: 2; transition: opacity 0.3s;`; characterArea.appendChild(moodEmojiDisplay);
        characterGraphicContainer = document.createElement('div'); characterGraphicContainer.id = 'gotchi-graphic-container'; characterGraphicContainer.style.cssText = `width: 80px; height: 100px; position: relative; margin-top: 30px;`;
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

        characterArea.appendChild(characterGraphicContainer); gameUiContainer.appendChild(characterArea);

        // 3. Message Display Area
        messageDisplayArea = document.createElement('div'); messageDisplayArea.id = 'gotchi-message-display'; messageDisplayArea.style.cssText = `position: absolute; bottom: 110px; left: 50%; transform: translateX(-50%); background-color: rgba(0, 0, 0, 0.7); color: white; padding: 8px 15px; border-radius: 15px; font-size: 0.9em; text-align: center; opacity: 0; transition: opacity 0.3s ease-in; z-index: 3; max-width: 80%; white-space: normal;`; gameUiContainer.appendChild(messageDisplayArea);

        // 4. Command Buttons Area
        const commandsArea = document.createElement('div'); commandsArea.style.cssText = `display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 10px 0; flex-shrink: 0; width: 100%; max-width: 450px;`;
        const createButton = (text, id, handler, icon) => { const button = document.createElement('button'); button.id = id; button.className = 'rps-choice-button'; button.style.fontSize = '0.9em'; button.style.padding = '8px 12px'; button.innerHTML = `${icon ? icon + ' ' : ''}${text}`; button.onclick = handler; commandsArea.appendChild(button); return button; };
        feedButton = createButton('Feed', 'gotchi-feed-btn', _handleFeed, '🍖'); playButton = createButton('Play', 'gotchi-play-btn', _handlePlay, '🧶'); cleanButton = createButton('Clean', 'gotchi-clean-btn', _handleClean, '✨'); napButton = createButton('Nap', 'gotchi-nap-btn', _handleNapToggle, '💤'); headpatButton = createButton('Headpat', 'gotchi-headpat-btn', _handleHeadpat, '♡');
        gameUiContainer.appendChild(commandsArea);

        // 5. Daily Task Button
        dailyTaskButton = document.createElement('button'); dailyTaskButton.id = 'gotchi-daily-tasks'; dailyTaskButton.textContent = `Daily (X/Y)`;
        dailyTaskButton.className = 'rps-choice-button secondary';
        dailyTaskButton.style.cssText = `font-size: 0.8em; position: absolute; bottom: 10px; right: 10px; padding: 4px 8px; z-index: 5;`;
        dailyTaskButton.onclick = _showDailyTasksPopup;
        gameUiContainer.appendChild(dailyTaskButton);

        // Create Daily Tasks Popup (Hidden Initially)
        _createTasksPopup();

        // Final Setup
        _updateStatBars(); _calculateMoodAndEmoji(); _updateCharacterVisuals(); _updateCommandButtons(); _updateDailyTaskDisplay();
    }

    // Function to create the tasks popup
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
        if (isNapping && characterGraphicContainer) { characterGraphicContainer.style.transform = 'translateY(0px)'; }
    }


    function _updateCommandButtons() {
        if (feedButton) feedButton.disabled = isNapping || hunger > 85;
        if (playButton) playButton.disabled = isNapping || energy < 20 || happiness > 90;
        if (cleanButton) cleanButton.disabled = isNapping;
        if (napButton) { napButton.innerHTML = isNapping ? '☀️ Wake Up!' : '💤 Nap'; napButton.disabled = (!isNapping && energy > 90); }
        if (headpatButton) headpatButton.disabled = isNapping || affection > 95;
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

    // --- Event Handlers ---
    function _handleFeed() { if (isNapping || hunger > 85) return; hunger = _clampStat(hunger + FEED_HUNGER_GAIN); happiness = _clampStat(happiness + FEED_HAPPINESS_GAIN); if (!dailyTasks.fed_check) affection = _clampStat(affection + 5); dailyTasks.fed_check = true; lastMemory = "fed_well"; _updateStats(); _saveState(); _displayRandomMessage(); if (!isApiFetchingMessages) _fetchNewMessages(); }
    function _handlePlay() { if (isNapping || energy < 20 || happiness > 90) return; happiness = _clampStat(happiness + PLAY_HAPPINESS_GAIN); energy = _clampStat(energy - PLAY_ENERGY_LOSS); if (!dailyTasks.played_check) affection = _clampStat(affection + DAILY_TASK_AFFECTION_GAIN / 2); dailyTasks.played_check = true; lastMemory = "played_with"; _updateStats(); _saveState(); _displayRandomMessage(); if (!isApiFetchingMessages) _fetchNewMessages(); }
    function _handleClean() { if (isNapping) return; happiness = _clampStat(happiness + CLEAN_HAPPINESS_GAIN); if (!dailyTasks.tidied) affection = _clampStat(affection + 3); dailyTasks.tidied = true; lastMemory = "cleaned_space"; _updateStats(); _saveState(); _displayRandomMessage(); if (!isApiFetchingMessages) _fetchNewMessages(); }
    function _handleNapToggle() { isNapping = !isNapping; if (isNapping) { if (messagePopupIntervalId) clearInterval(messagePopupIntervalId); messagePopupIntervalId = null; _stopMusic(); if(messageDisplayArea) { if(messageDisplayArea.fadeTimeout) clearTimeout(messageDisplayArea.fadeTimeout); messageDisplayArea.style.transition = 'none'; messageDisplayArea.style.opacity = '0'; } } else { if (!messagePopupIntervalId) messagePopupIntervalId = setInterval(_displayRandomMessage, MESSAGE_POPUP_INTERVAL_MS); _updateMusic(); lastMemory = "woke_up"; _fetchNewMessages(); _displayRandomMessage(); } lastUpdateTime = Date.now(); _updateCharacterVisuals(); _updateCommandButtons(); _saveState(); console.log("Nap toggled:", isNapping); }
    function _handleHeadpat() { if (isNapping || affection > 95) return; happiness = _clampStat(happiness + HEADPAT_HAPPINESS_GAIN); affection = _clampStat(affection + HEADPAT_AFFECTION_GAIN); if (!dailyTasks.greeted) affection = _clampStat(affection + 5); dailyTasks.greeted = true; lastMemory = "got_headpats"; _updateStats(); _saveState(); if (moodEmojiDisplay) moodEmojiDisplay.textContent = '💖'; if (characterGraphicContainer) characterGraphicContainer.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' }); setTimeout(() => _updateCharacterVisuals(), 400); _displayRandomMessage(); if (!isApiFetchingMessages) _fetchNewMessages(); }


    // --- Initialization and Exit ---
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
         console.log(`Initializing MikaGotchi (v1.3.3 Class BG Fix) for ${userName}, Persona: ${persona}`);
         gameUiContainer = _gameUiContainer; messageCallback = _messageCallback; apiCaller = _apiCaller;
         currentUserName = userName || "User"; currentPersonaInGame = persona || 'Mika';
         isApiFetchingMessages = false; currentMessages = [];
         if (!gameUiContainer) { console.error("Gotchi UI container missing!"); if(messageCallback) messageCallback('System', 'Error: Gotchi UI container missing!'); return; }
         if (gameLoopIntervalId) clearInterval(gameLoopIntervalId); if (messagePopupIntervalId) clearInterval(messagePopupIntervalId);
         _loadState(); _handleDailyReset();
         _createMainUI();
         gameLoopIntervalId = setInterval(_updateStats, UPDATE_INTERVAL_MS);
         if (!isNapping) { messagePopupIntervalId = setInterval(_displayRandomMessage, MESSAGE_POPUP_INTERVAL_MS); setTimeout(_displayRandomMessage, 1500); }
         _fetchNewMessages(true); _updateMusic();
         console.log(`MikaGotchi initialized. Mood: ${currentMood}, Napping: ${isNapping}`);
     }


    function onExit() {
        console.log("MikaGotchi onExit called.");
        // Stop intervals first
        if (gameLoopIntervalId) { clearInterval(gameLoopIntervalId); gameLoopIntervalId = null; }
        if (messagePopupIntervalId) { clearInterval(messagePopupIntervalId); messagePopupIntervalId = null; }
        if (messageDisplayArea && messageDisplayArea.fadeTimeout) { clearTimeout(messageDisplayArea.fadeTimeout); }

        // Capture the container reference *before* clearing internal refs
        const containerRef = gameUiContainer;

        // Stop music
        _stopMusic();
        // Save state BEFORE clearing UI
        _saveState();

        // Hide and try to remove the tasks popup if it exists from the body
        let popup = document.getElementById('gotchi-tasks-popup-overlay');
        if (popup && popup.parentNode === document.body) {
             document.body.removeChild(popup);
             console.log("Removed tasks popup from body.");
        }
        tasksPopupOverlay = null; // Ensure ref is cleared

        // --- ** Remove class instead of inline style ** ---
        if (containerRef) {
            containerRef.classList.remove('gotchi-mika-active', 'gotchi-kana-active');
            console.log("Removed Gotchi active classes from #app-area.");
        } else {
            // Fallback just in case ref is lost
            const appAreaDirect = document.getElementById('app-area');
             if (appAreaDirect) {
                 appAreaDirect.classList.remove('gotchi-mika-active', 'gotchi-kana-active');
                 console.log("Removed Gotchi active classes directly from #app-area.");
             } else {
                 console.warn("Could not get gameUiContainer reference AFTER cleanup to remove classes!");
             }
        }
        // --- ** END ** ---

        // Clear UI elements and internal DOM references LAST
        _clearUI();

        console.log("MikaGotchi cleanup complete.");
        return Promise.resolve(true); // Indicate cleanup finished
    }

    // --- Public Interface ---
    return {
        init: init,
        onExit: onExit
    };

})();

// --- END OF FILE gotchi.js ---