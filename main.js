    <!-- Main Application Logic -->
        // Nyaa~! Mika & Kana's Helper & Fun Time App! ♡ (With Notifications!)

        // --- DOM Elements ---
        const bodyElement = document.body; const themeColorMeta = document.getElementById('theme-color-meta');
        const disclaimerPopup = document.getElementById('disclaimer-popup'); const disclaimerAgreeButton = document.getElementById('disclaimer-agree-button');
        const apiKeyPopup = document.getElementById('api-key-popup'); const apiKeyInput = document.getElementById('api-key-input'); const saveApiKeyButton = document.getElementById('save-api-key-button'); const apiKeyError = document.getElementById('api-key-error');
        const namePopup = document.getElementById('name-popup'); const nameInput = document.getElementById('name-input'); const saveNameButton = document.getElementById('save-name-button'); const nameError = document.getElementById('name-error');
        const installPopup = document.getElementById('install-popup'); const installButton = document.getElementById('install-button'); const installLaterButton = document.getElementById('install-later-button');
        const kanaWarningPopup = document.getElementById('kana-warning-popup'); const kanaSwitchConfirmButton = document.getElementById('kana-switch-confirm-button'); const kanaSwitchCancelButton = document.getElementById('kana-switch-cancel-button');
        const mikaWarningPopup = document.getElementById('mika-warning-popup'); const mikaSwitchConfirmButton = document.getElementById('mika-switch-confirm-button'); const mikaSwitchCancelButton = document.getElementById('mika-switch-cancel-button');
        const aboutPopup = document.getElementById('about-popup'); const aboutTitle = document.getElementById('about-title'); const aboutContent = document.getElementById('about-content'); const aboutCloseButton = document.getElementById('about-close-button');
        // Chat Elements
        const chatContainer = document.getElementById('chat-container'); const chatTitle = document.getElementById('chat-title');
        const mainContentArea = document.getElementById('main-content-area'); const chatArea = document.getElementById('chat-area');
        const appArea = document.getElementById('app-area');
        const chatLog = document.getElementById('chat-log'); const chatInput = document.getElementById('chat-input'); const sendButton = document.getElementById('send-button');
        // Header & Dropdown Elements
        const settingsButton = document.getElementById('settings-button'); const homeButton = document.getElementById('home-button'); const historyButton = document.getElementById('history-button');
        const appsButton = document.getElementById('apps-button');
        const historyDropdown = document.getElementById('history-dropdown'); const settingsDropdown = document.getElementById('settings-dropdown');
        const appsDropdown = document.getElementById('apps-dropdown');
        // App Buttons
        const appTttButton = document.getElementById('app-ttt-button'); const appRpsButton = document.getElementById('app-rps-button'); const appGtnButton = document.getElementById('app-gtn-button'); const app20qButton = document.getElementById('app-20q-button'); const appDiaryButton = document.getElementById('app-diary-button'); const appStoryButton = document.getElementById('app-story-button'); const appChoresButton = document.getElementById('app-chores-button'); const appTrackerButton = document.getElementById('app-tracker-button'); const appHoroscopeButton = document.getElementById('app-horoscope-button'); const appRpgButton = document.getElementById('app-rpg-button'); const appJetpackButton = document.getElementById('app-jetpack-button'); const appComicButton = document.getElementById('app-comic-button'); const appGotchiButton = document.getElementById('app-gotchi-button');
        // Settings Buttons
        const settingsInstallButton = document.getElementById('settings-install-button'); const settingsThemeButton = document.getElementById('settings-theme-button');
        const settingsAboutButton = document.getElementById('settings-about-button');
        const settingsPersonaButton = document.getElementById('settings-persona-button'); const settingsResetButton = document.getElementById('settings-reset-button');
        // Image Upload
        const imageUploadInput = document.getElementById('image-upload-input'); const imageUploadButton = document.getElementById('image-upload-button'); const cameraButton = document.getElementById('camera-button'); const imagePreviewArea = document.getElementById('image-preview-area'); const imagePreview = document.getElementById('image-preview'); const removeImageButton = document.getElementById('remove-image-button');
        const deleteAllHistoryButtonTemplate = document.createElement('button'); deleteAllHistoryButtonTemplate.className = 'delete-history'; deleteAllHistoryButtonTemplate.textContent = 'Delete ALL History'; deleteAllHistoryButtonTemplate.title = 'Permanently delete all saved chats!';
        // *** NEW Notification Elements ***
        const settingsNotificationsButton = document.getElementById('settings-notifications-button');
        const notificationsPopup = document.getElementById('notifications-popup');
        const notificationsPopupTitle = document.getElementById('notifications-popup-title');
        const notificationsPopupText = document.getElementById('notifications-popup-text');
        const notificationsEnableButton = document.getElementById('notifications-enable-button');
        const notificationsDisableButton = document.getElementById('notifications-disable-button');
        const notificationsCloseButton = document.getElementById('notifications-close-button');

        // --- State & Config ---
        let currentChatHistory = []; let isAssistantTyping = false; let currentApiKey = null; let currentUserName = "Study Buddy"; let allChats = {}; let currentChatId = null; const MAX_HISTORY_LENGTH = 16; let deferredInstallPrompt = null; const DISCLAIMER_AGREED_KEY = 'mikaDisclaimerAgreed_v1'; const THEME_PREFERENCE_KEY = 'mikaThemePreference_v1'; const INSTALL_PROMPT_SHOWN_KEY = 'mikaInstallPromptShown'; let selectedImageData = null; let selectedImageMimeType = null; const MAX_IMAGE_SIZE_MB = 4;
        let isAppActive = false;
        let currentActiveAppModule = null;
        let currentPersona = 'Mika'; const PERSONA_PREFERENCE_KEY = 'mikaPersonaPreference_v1';
        const API_COUNT_STORAGE_KEY = 'mikaApiCallTracker_v1';
        let apiCallCountData = { date: '', count: 0 };
        // *** NEW Notification State ***
        let notificationPermission = 'default'; // Initialize assuming default
        if ('Notification' in window) {
            notificationPermission = Notification.permission; // Get actual state if supported
        }
        let areNotificationsEnabled = false;
        const NOTIFICATIONS_ENABLED_KEY = 'mikaNotificationsEnabled_v1';
        const NOTIFICATION_CACHE_KEY = 'mikaNotificationCache_v1';
        const NOTIFICATION_SCHEDULE_TIME_HOUR = 19; // 7 PM
        let notificationCache = [];
        let scheduledNotificationTimeoutId = null;

        // --- Utility Functions ---
        const getTimestamp = () => Date.now();
        const sanitizeHTML = (str) => { if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) { return DOMPurify.sanitize(str, { USE_PROFILES: { html: true }, ALLOWED_TAGS: ['strong', 'em', 'code', 'br', 'del', 'pre', 'span', 'div', 'p', 'h3', 'h4', 'label', 'button', 'input', 'strong', 'i', 'ul', 'li'], KEEP_CONTENT: true }); } else { console.warn("DOMPurify missing, basic fallback."); return str.replace(/</g, '&lt;').replace(/>/g, '>'); } };
        function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }

        // --- Local Storage ---
        function saveToLocalStorage(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { console.error(`Save LS Error [${key}]:`, e); return false; } }
        function loadFromLocalStorage(key) { try { const v = localStorage.getItem(key); return v; } catch (e) { console.error(`Load LS Error [${key}]:`, e); } return null; }
        function clearFromLocalStorage(key) { try { localStorage.removeItem(key); console.log(`Cleared ${key}`); } catch (e) { console.error(`Clear LS Error [${key}]:`, e); } }
        const saveApiKey = (k) => saveToLocalStorage('geminiApiKey_mikaHelper', k); const loadApiKey = () => loadFromLocalStorage('geminiApiKey_mikaHelper'); const clearApiKey = () => clearFromLocalStorage('geminiApiKey_mikaHelper');
        const saveUserName = (n) => saveToLocalStorage('mikaHelper_userName', n); const loadUserName = () => loadFromLocalStorage('mikaHelper_userName'); const clearUserName = () => clearFromLocalStorage('mikaHelper_userName');
        const saveDisclaimerAgreement = () => saveToLocalStorage(DISCLAIMER_AGREED_KEY, 'true'); const hasAgreedToDisclaimer = () => loadFromLocalStorage(DISCLAIMER_AGREED_KEY) === 'true'; const clearDisclaimerAgreement = () => clearFromLocalStorage(DISCLAIMER_AGREED_KEY);
        const saveInstallPromptShown = () => saveToLocalStorage(INSTALL_PROMPT_SHOWN_KEY, 'true'); const hasInstallPromptBeenShown = () => loadFromLocalStorage(INSTALL_PROMPT_SHOWN_KEY) === 'true'; const clearInstallPromptShown = () => clearFromLocalStorage(INSTALL_PROMPT_SHOWN_KEY);
        const saveThemePreference = (t) => saveToLocalStorage(THEME_PREFERENCE_KEY, t); const loadThemePreference = () => loadFromLocalStorage(THEME_PREFERENCE_KEY); const clearThemePreference = () => clearFromLocalStorage(THEME_PREFERENCE_KEY);
        const savePersonaPreference = (p) => saveToLocalStorage(PERSONA_PREFERENCE_KEY, p); const loadPersonaPreference = () => loadFromLocalStorage(PERSONA_PREFERENCE_KEY); const clearPersonaPreference = () => clearFromLocalStorage(PERSONA_PREFERENCE_KEY);

        // --- Chat History Management ---
        function saveAllChats() { try { if (currentChatId && currentChatHistory.length > 0) { allChats[currentChatId] = currentChatHistory; } if (Object.keys(allChats).length > 0) { saveToLocalStorage('mikaHelper_allChats', JSON.stringify(allChats)); } else { clearFromLocalStorage('mikaHelper_allChats'); } } catch (e) { console.error("Save Chats Error:", e); } }
        function loadAllChats() { try { const stored = loadFromLocalStorage('mikaHelper_allChats'); if (stored) { allChats = JSON.parse(stored); const ids = Object.keys(allChats).sort((a, b) => b - a); if (ids.length > 0) return ids[0]; } } catch (e) { console.error("Load Chats Error:", e); allChats = {}; clearFromLocalStorage('mikaHelper_allChats'); } return null; }
        function deleteAllChats() { const confirmMsg = `Delete ALL chat history for ${currentUserName}? This cannot be undone!`; if (confirm(confirmMsg)) { clearFromLocalStorage('mikaHelper_allChats'); allChats = {}; startNewChat(false); updateHistoryDropdown(); const deletedMsg = `All chat history deleted for ${currentUserName}.`; appendMessage('system', deletedMsg); console.log("History deleted."); closeAllDropdowns(); } }

        // --- Theme & Persona ---
        function applyTheme(theme) { if (theme === 'dark') { bodyElement.classList.add('dark-mode'); settingsThemeButton.textContent = "☀️ Light Mode"; themeColorMeta.content = '#2c1f30'; } else { bodyElement.classList.remove('dark-mode'); settingsThemeButton.textContent = "🌙 Dark Mode"; themeColorMeta.content = '#d81b60'; } }
        function toggleTheme() { const newTheme = bodyElement.classList.contains('dark-mode') ? 'light' : 'dark'; applyTheme(newTheme); saveThemePreference(newTheme); closeAllDropdowns(); }
        function applyPersona(persona, isInitialLoad = false) {
            currentPersona = persona;
            if (!chatTitle || !chatInput || !settingsPersonaButton || !mikaWarningPopup || !kanaWarningPopup) { console.warn("Persona UI elements not found."); return; }
            settingsPersonaButton.textContent = (persona === 'Mika') ? "Switch to Kana" : "Switch to Mika";
            const namePlaceholders = document.querySelectorAll('.popup-user-name-placeholder');
            namePlaceholders.forEach(span => { span.textContent = sanitizeHTML(currentUserName); });
            if (!isAppActive) { updateChatTitle(); updateInputPlaceholder(); }
            let systemMessageText = "";
            if (!isInitialLoad && !isAppActive) {
                if (persona === 'Kana') { systemMessageText = `Switched to Kana for ${currentUserName}.`; }
                else { systemMessageText = `Mika is back! Yay! Ready to help, ${currentUserName}! ♡`; }
                appendMessage('system', systemMessageText);
            }
            updateTypingIndicatorText();
            savePersonaPreference(persona);
            console.log(`Applied persona: ${persona}`);
            // *** Call Notification Update Functions for Persona Change ***
            loadNotificationCache(); // Load cache specific to the new persona
            updateNotificationButtonState(); // Update button text/state
            scheduleDailyNotification(); // Reschedule (it checks enabled status internally)
        }
        function updateTypingIndicatorText() { const indicator = chatLog?.querySelector('.typing-indicator'); if (indicator) { indicator.innerHTML = (currentPersona === 'Kana') ? `Kana is contemplating ${currentUserName}'s request... *sigh*` : `Mika is thinking... *purrrr*`; } const storyStatusArea = document.getElementById('story-status-area'); const horoscopeLoading = document.getElementById('horoscope-loading'); const questStatusArea = document.getElementById('quest-status-area'); if (isAppActive && isAssistantTyping) { if(storyStatusArea) storyStatusArea.textContent = (currentPersona === 'Kana') ? 'Generating narrative...' : 'Mika is weaving the tale... *purrrr*'; if(horoscopeLoading) horoscopeLoading.textContent = (currentPersona === 'Kana') ? 'Consulting the void...' : 'Gazing at the stars... ✨'; if(questStatusArea) questStatusArea.textContent = (currentPersona === 'Kana') ? 'Calculating fate...' : 'GM is thinking... *rolls dice*'; } }

        // --- PWA Install ---
        function setupInstallPromptHandler() { window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstallPrompt = e; console.log('beforeinstallprompt fired'); if (settingsInstallButton) settingsInstallButton.disabled = false; if (!hasInstallPromptBeenShown() && chatContainer.style.display === 'flex' && !isAppActive) { installPopup.style.display = 'flex'; } else { console.log("Install prompt deferred."); } }); installButton.addEventListener('click', handleManualInstall); installLaterButton.addEventListener('click', () => { installPopup.style.display = 'none'; saveInstallPromptShown(); console.log('Install later.'); }); window.addEventListener('appinstalled', () => { console.log('PWA installed'); installPopup.style.display = 'none'; if (settingsInstallButton) settingsInstallButton.disabled = true; deferredInstallPrompt = null; }); }
        async function handleManualInstall() { if (installPopup.style.display === 'flex') installPopup.style.display = 'none'; closeAllDropdowns(); if (deferredInstallPrompt) { try { deferredInstallPrompt.prompt(); const { outcome } = await deferredInstallPrompt.userChoice; console.log(`Install outcome: ${outcome}`); if (outcome === 'accepted') { if (settingsInstallButton) settingsInstallButton.disabled = true; } saveInstallPromptShown(); } catch (err) { console.error("Install prompt error:", err); appendMessage('system', `Mrow! Install prompt failed... (${currentPersona === 'Kana' ? 'Whatever.' : 'Nyaa!'})`); } } else { console.log("Install prompt not available."); appendMessage('system', `Already installed or not available, ${currentPersona === 'Kana' ? 'obviously' : 'nyaa~'}!`); if (settingsInstallButton) settingsInstallButton.disabled = true; } }
        function registerServiceWorker() { if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').then((reg) => { console.log('SW registered:', reg.scope); /* reg.update(); */ }).catch((err) => console.error('SW registration failed:', err)); navigator.serviceWorker.addEventListener('controllerchange', () => { console.log('New service worker activated. Reloading...'); window.location.reload(); }); } else { console.log("SW not supported."); } }

        // --- Chat UI ---
        function appendMessage(sender, message, isHtml = false, imageUrl = null) { if (!chatLog || !chatArea || chatArea.style.display === 'none') { console.log(`Skipped message append for ${sender} because chatArea is hidden.`); return; } const msgId = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`; const el = document.createElement('p'); el.id = msgId; const contentSpan = document.createElement('span'); contentSpan.className = 'message-content'; const msgText = isHtml ? message : sanitizeHTML(message); if (sender === 'user') { el.className = 'user-message'; contentSpan.innerHTML = `<strong>${sanitizeHTML(currentUserName)}:</strong> ${msgText}`; if (imageUrl && imageUrl !== "[Image Placeholder]") { const img = document.createElement('img'); img.src = imageUrl; img.alt = "Uploaded image"; img.className = "thumbnail"; contentSpan.appendChild(document.createElement('br')); contentSpan.appendChild(img); } else if (imageUrl === "[Image Placeholder]") { const placeholder = document.createElement('em'); placeholder.textContent = ' [Image Attached]'; placeholder.style.fontSize = '0.9em'; contentSpan.appendChild(placeholder); } } else if (sender === 'Mika' || sender === 'Kana') { el.className = 'mika-message'; let proc = msgText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/```([\s\S]*?)```/g, (m, p1) => `<pre><code>${sanitizeHTML(p1.trim())}</code></pre>`).replace(/(?<!<br>)\n/g, '<br>'); contentSpan.innerHTML = `<strong>${sender}:</strong> ${proc}`; } else { el.className = 'system-message'; contentSpan.innerHTML = msgText; } el.appendChild(contentSpan); chatLog.appendChild(el); scrollToBottom(); }
        function showTypingIndicator() { if (!chatLog || !chatArea || chatArea.style.display === 'none') return; removeTypingIndicator(); const el = document.createElement('p'); el.className = 'typing-indicator'; el.innerHTML = (currentPersona === 'Kana') ? `Kana is contemplating ${currentUserName}'s request... *sigh*` : `Mika is thinking... *purrrr*`; chatLog.appendChild(el); scrollToBottom(); }
        function removeTypingIndicator() { if (!chatLog || !chatArea || chatArea.style.display === 'none') return; const ind = chatLog.querySelector('.typing-indicator'); if (ind) ind.remove(); }
        function scrollToBottom() { if (chatLog) { setTimeout(() => { chatLog.scrollTop = chatLog.scrollHeight; }, 50); } }
        function clearChatDisplay() { if (chatLog) chatLog.innerHTML = ''; }
        function enableChatInput() { if (!chatInput || !sendButton || !imageUploadButton || !cameraButton || isAppActive) return; const hasText = chatInput.value.trim().length > 0; const hasImage = !!selectedImageData; chatInput.disabled = false; imageUploadButton.disabled = false; cameraButton.disabled = false; sendButton.disabled = !(hasText || hasImage); updateInputPlaceholder(); }
        function disableChatInput(message = null) { if (!chatInput || !sendButton || !imageUploadButton || !cameraButton) return; chatInput.disabled = true; sendButton.disabled = true; imageUploadButton.disabled = true; cameraButton.disabled = true; const thinkingMessage = message || (currentPersona === 'Kana' ? `Kana is thinking, ${currentUserName}...` : 'Mika is thinking...'); chatInput.placeholder = isAppActive ? "App Active..." : thinkingMessage; }
        function updateChatTitle() { if (!chatTitle) return; if (isAppActive) { /* Title set by switchToAppView */ } else { chatTitle.textContent = (currentPersona === 'Kana') ? `Kana & ${sanitizeHTML(currentUserName)}` : `Mika & ${sanitizeHTML(currentUserName)}! ♡`; document.title = chatTitle.textContent; } }
        function updateInputPlaceholder() { if (chatInput && !chatInput.disabled) { if (isAppActive) { chatInput.placeholder = `Input for app...`; } else { chatInput.placeholder = (currentPersona === 'Kana') ? `What do you want, ${currentUserName}? Spill it.` : `Ask me anything, ${currentUserName}! ♡`; } } }

        // --- Chat Management ---
        function startNewChat(greet = true) { if (isAppActive) { console.warn("Attempted start new chat while app active."); appendMessage('system', `Finish the app or go Home first, ${currentUserName}!`); return; } if (currentChatId && currentChatHistory.length > 0) { allChats[currentChatId] = currentChatHistory; saveAllChats(); } currentChatId = getTimestamp(); currentChatHistory = []; clearChatDisplay(); let welcomeMsg = ""; if (greet) { welcomeMsg = (currentPersona === 'Kana') ? `New chat. Ask your questions, ${currentUserName}.` : `Ready for your homework, ${currentUserName}! Or anything else you wanna talk about~ ♡`; } else { welcomeMsg = `Started a new chat for ${currentUserName}.`; } appendMessage('system', welcomeMsg); removeSelectedImage(); enableChatInput(); updateHistoryDropdown(); console.log(`New chat started: ${currentChatId}`); closeAllDropdowns(); }
        function loadChat(chatId) { switchToChatView(); if (currentChatId && currentChatHistory.length > 0 && currentChatId !== chatId) { allChats[currentChatId] = currentChatHistory; } if (allChats[chatId]) { currentChatId = chatId; currentChatHistory = allChats[chatId]; clearChatDisplay(); const loadMsg = (currentPersona === 'Kana') ? `Loaded chat from ${new Date(parseInt(chatId)).toLocaleString()}. Try to keep up, ${currentUserName}.` : `Loaded chat from ${new Date(parseInt(chatId)).toLocaleString()}. Welcome back, ${currentUserName}! ♡`; appendMessage('system', loadMsg); currentChatHistory.forEach(msg => { let displayMsg = msg.parts.find(p => p.text)?.text || ""; let displayImgPlaceholder = msg.parts.some(p => p.placeholder === "[Image Sent]"); let senderName = (msg.role === 'user') ? 'user' : currentPersona; appendMessage(senderName, displayMsg, false, displayImgPlaceholder ? "[Image Placeholder]" : null); }); removeSelectedImage(); enableChatInput(); console.log(`Loaded chat: ${chatId}`); } else { console.error(`Chat ID ${chatId} not found.`); appendMessage('system', `${currentPersona === 'Kana' ? 'Can\'t find that chat. Idiot.' : 'Mrow! Couldn\'t find that chat, ' + currentUserName + '!'}`); } closeAllDropdowns(); saveAllChats(); }

        // --- Dropdowns ---
        function closeAllDropdowns() {
            if (historyDropdown) historyDropdown.style.display = 'none';
            if (settingsDropdown) settingsDropdown.style.display = 'none';
            if (appsDropdown) appsDropdown.style.display = 'none';
            if (aboutPopup && aboutPopup.style.display === 'flex') aboutPopup.style.display = 'none';
            if (notificationsPopup && notificationsPopup.style.display === 'flex') notificationsPopup.style.display = 'none'; // <<< Close notifications popup
        }
        function toggleDropdown(dd) { const isOpen = dd.style.display === 'block'; closeAllDropdowns(); if (!isOpen) { dd.style.display = 'block'; if (dd === historyDropdown) updateHistoryDropdown(); if (dd === settingsDropdown) updateSettingsDropdown(); if (dd === appsDropdown) updateAppsDropdown(); } }
        function updateHistoryDropdown() { if (!historyDropdown) return; historyDropdown.innerHTML = ''; const ids = Object.keys(allChats).sort((a, b) => b - a); if (ids.length === 0) { const p = document.createElement('p'); p.className = 'no-items'; p.textContent = 'No past chats!'; historyDropdown.appendChild(p); } else { ids.forEach(id => { const chat = allChats[id]; if (chat && chat.length > 0) { const btn = document.createElement('button'); const firstMsg = chat.find(m => m.role === 'user'); const txt = firstMsg?.parts.find(p => p.text)?.text || 'Chat'; const img = firstMsg?.parts.some(p => p.placeholder === "[Image Sent]"); const prev = sanitizeHTML(txt.substring(0, 20)) + (img ? ' [📷]' : '') + '...'; const date = new Date(parseInt(id)).toLocaleString(); btn.textContent = `${date} - ${prev}`; btn.title = `Load: ${date}`; btn.onclick = () => loadChat(id); historyDropdown.appendChild(btn); } }); } if (ids.length > 0) { const delBtn = deleteAllHistoryButtonTemplate.cloneNode(true); delBtn.onclick = deleteAllChats; historyDropdown.appendChild(delBtn); } }
        function updateSettingsDropdown() { if (!settingsInstallButton || !settingsPersonaButton || !settingsNotificationsButton) return; settingsInstallButton.disabled = !deferredInstallPrompt; applyTheme(loadThemePreference() || 'light'); settingsPersonaButton.textContent = (currentPersona === 'Mika') ? "Switch to Kana" : "Switch to Mika"; updateNotificationButtonState(); /* Update notification button state */ }
        function updateAppsDropdown() { /* Placeholder */ }

        // --- View Switching ---
        async function switchToChatView() { if (!appArea || !chatArea) return; console.log(`Switching to Chat. isAppActive: ${isAppActive}, currentModule: ${currentActiveAppModule?.constructor?.name}`); if (isAppActive && currentActiveAppModule?.onExit) { console.log("Calling app onExit..."); try { await Promise.race([ currentActiveAppModule.onExit(), new Promise((_, reject) => setTimeout(() => reject(new Error("App onExit timed out")), 2000)) ]); console.log("App onExit completed."); } catch (err) { console.error("App onExit error or timeout:", err); } } else if (isAppActive) { console.warn("App was active but no onExit function found."); } currentActiveAppModule = null; isAppActive = false; appArea.style.display = 'none'; chatArea.style.display = 'flex'; clearAppAreaContent(); console.log("View switched to: Chat"); if (homeButton) { homeButton.textContent = '➕ New Chat'; homeButton.title = 'Start a New Chat'; homeButton.onclick = () => startNewChat(true); } updateChatTitle(); updateInputPlaceholder(); enableChatInput(); if (deferredInstallPrompt && !hasInstallPromptBeenShown()) { console.log("Showing deferred install prompt."); installPopup.style.display = 'flex'; } }
        function switchToAppView(module = null, appTitle = "Running App...") { if (!appArea || !chatArea) return; chatArea.style.display = 'none'; appArea.style.display = 'flex'; isAppActive = true; currentActiveAppModule = module; closeAllDropdowns(); disableChatInput("App Active..."); if (chatTitle) chatTitle.textContent = appTitle; document.title = appTitle; if (installPopup.style.display === 'flex') { installPopup.style.display = 'none'; console.log("Hiding install prompt for app."); } console.log(`View switched to: App (${module?.constructor?.name || 'Unknown'})`); if (homeButton) { homeButton.textContent = '🏠 Home'; homeButton.title = 'Back to Main Chat'; homeButton.onclick = switchToChatView; } }

        // --- App Loading ---
        function setupAppAreaBase(titleText) { if (!appArea) return null; clearAppAreaContent(); return appArea; }
        function displayAppMessage(sender, text) { const noLogModules = [MikaDiary, StoryTime, ChoreHelper, PeriodTracker, HoroscopeApp, RpgApp, JetpackGame, ComicStripApp, MikaGotchi]; if (noLogModules.some(mod => currentActiveAppModule === mod)) { console.log(`Skipping displayAppMessage for ${sender} in ${currentActiveAppModule?.constructor?.name || 'current app'}.`); return; } let log = document.getElementById('app-message-log'); if (!log) { console.warn("Shared app message log not found, creating."); log = document.createElement('div'); log.id = 'app-message-log'; log.style.cssText = `width: calc(100% - 20px); max-width: 600px; height: 100px; overflow-y: auto; border: 1px solid var(--game-message-log-border); background: var(--game-message-log-bg); padding: 8px; margin: 10px auto 10px auto; border-radius: 5px; font-size: 0.9em; color: var(--game-message-log-text); scrollbar-width: thin; scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track); box-sizing: border-box; flex-shrink: 0;`; const backButton = appArea.querySelector('#back-to-chat-button'); if(backButton) { appArea.insertBefore(log, backButton); } else { appArea.appendChild(log); } } log.style.display = 'block'; const el = document.createElement('p'); let msg = sanitizeHTML(text); let css = 'system-gamemsg'; const userNameForDisplay = sanitizeHTML(currentUserName); if (sender === 'Mika' || sender === 'Kana') { css = 'mika-gamemsg'; msg = msg.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/~(\S.*?\S)~/g,'<del>$1</del>').replace(/(?<!<br>)\n/g,'<br>'); el.innerHTML = `<strong>${sender}:</strong> ${msg}`; } else if (sender === 'User') { css = 'user-gamemsg'; el.innerHTML = `<strong>${userNameForDisplay}:</strong> ${msg}`; } else { css = 'system-gamemsg'; el.innerHTML = msg; } el.className = css; log.appendChild(el); setTimeout(() => { if(log) log.scrollTop = log.scrollHeight; }, 50); }
        async function callMikaApiForApp(prompt, context = []) { if (!currentApiKey) { displayAppMessage('System', 'Error: API Key missing!'); return Promise.reject("API Key missing!"); } const user = currentUserName || "User"; console.log(`API app call (${currentPersona} for ${user}): ${prompt.substring(0,60)}...`); try { const resp = await sendMessageToMika(prompt, context, currentApiKey, user, currentPersona, null, null, incrementApiCount); return (typeof resp === 'string' && resp.trim()) ? resp : null; } catch (err) { console.error("API app error:", err); displayAppMessage('System', `API Error: ${err}`); return Promise.reject(`API error: ${err}`); } }

        // --- Load Specific Apps ---
         function loadTicTacToe() { const module = TicTacToe; const appTitle = "Tic-Tac-Toe"; switchToAppView(module, appTitle); const container = setupAppAreaBase(); if (container && module?.init) { const uiWrapper = document.createElement('div'); uiWrapper.style.cssText=`display: flex; flex-direction: column; align-items: center; width:100%; flex-grow:1; justify-content:center;`; const boardElement = document.createElement('div'); boardElement.id = 'ttt-board'; uiWrapper.appendChild(boardElement); container.appendChild(uiWrapper); const appLog = document.createElement('div'); appLog.id = 'app-message-log'; appLog.style.display = 'none'; container.appendChild(appLog); const backBtn = document.createElement('button'); backBtn.id = 'back-to-chat-button'; backBtn.textContent = 'Back to Chat'; backBtn.onclick = switchToChatView; container.appendChild(backBtn); module.init(boardElement, displayAppMessage, currentUserName, currentPersona); } else { console.error("TTT load fail"); switchToChatView(); appendMessage('system', 'Mrow! TTT failed...'); } }
         function loadRPS() { const module = RockPaperScissors; const appTitle = "Rock Paper Scissors!"; switchToAppView(module, appTitle); const container = setupAppAreaBase(); if (container && module?.init) { const uiWrapper = document.createElement('div'); uiWrapper.style.cssText=`display: flex; flex-direction: column; align-items: center; width:100%; flex-grow:1; justify-content:center;`; const uiArea = document.createElement('div'); uiArea.id = 'rps-ui-area'; uiWrapper.appendChild(uiArea); container.appendChild(uiWrapper); const appLog = document.createElement('div'); appLog.id = 'app-message-log'; appLog.style.display = 'none'; container.appendChild(appLog); const backBtn = document.createElement('button'); backBtn.id = 'back-to-chat-button'; backBtn.textContent = 'Back to Chat'; backBtn.onclick = switchToChatView; container.appendChild(backBtn); module.init(uiArea, displayAppMessage, callMikaApiForApp, currentUserName, currentPersona); } else { console.error("RPS load fail"); switchToChatView(); appendMessage('system', 'Mrow! RPS failed...'); } }
         function loadGuessTheNumber() { const module = GuessTheNumber; const appTitle = "Guess The Number"; switchToAppView(module, appTitle); const container = setupAppAreaBase(); if (container && module?.init) { const uiWrapper = document.createElement('div'); uiWrapper.style.cssText=`display: flex; flex-direction: column; align-items: center; width:100%; flex-grow:1; justify-content:center;`; const uiArea = document.createElement('div'); uiArea.id = 'gtn-ui-area'; uiWrapper.appendChild(uiArea); container.appendChild(uiWrapper); const appLog = document.createElement('div'); appLog.id = 'app-message-log'; appLog.style.display = 'none'; container.appendChild(appLog); const backBtn = document.createElement('button'); backBtn.id = 'back-to-chat-button'; backBtn.textContent = 'Back to Chat'; backBtn.onclick = switchToChatView; container.appendChild(backBtn); module.init(uiArea, displayAppMessage, callMikaApiForApp, currentUserName, currentPersona); } else { console.error("GTN load fail"); switchToChatView(); appendMessage('system', 'Mrow! GTN failed...'); } }
         function loadTwentyQuestions() { const module = TwentyQuestions; const appTitle = "20 Questions"; switchToAppView(module, appTitle); const container = setupAppAreaBase(); if (container && module?.init) { const uiWrapper = document.createElement('div'); uiWrapper.style.cssText=`display: flex; flex-direction: column; align-items: center; width:100%; flex-grow:1; justify-content:center;`; const uiArea = document.createElement('div'); uiArea.id = 'tq-ui-area'; uiWrapper.appendChild(uiArea); container.appendChild(uiWrapper); const appLog = document.createElement('div'); appLog.id = 'app-message-log'; appLog.style.display = 'none'; container.appendChild(appLog); const backBtn = document.createElement('button'); backBtn.id = 'back-to-chat-button'; backBtn.textContent = 'Back to Chat'; backBtn.onclick = switchToChatView; container.appendChild(backBtn); module.init(uiArea, displayAppMessage, callMikaApiForApp, currentUserName, currentPersona); } else { console.error("20Q load fail"); switchToChatView(); appendMessage('system', 'Mrow! 20Q failed...'); } }
         function loadDiary() { const module = MikaDiary; const appTitle = "Secret Diary ♡"; switchToAppView(module, appTitle); if (appArea && module?.init) { module.init(appArea, displayAppMessage, callMikaApiForApp, currentUserName, currentPersona); } else { console.error("Diary load fail"); switchToChatView(); appendMessage('system', 'Mrow! Diary failed...'); } }
         function loadStoryTime() { const module = StoryTime; const appTitle = "Story Time 📖"; switchToAppView(module, appTitle); if (appArea && module?.init) { module.init(appArea, displayAppMessage, callMikaApiForApp, currentUserName, currentPersona); } else { console.error("StoryTime load fail"); switchToChatView(); appendMessage('system', 'Mrow! Story Time failed...'); } }
         function loadChores() { const module = ChoreHelper; const appTitle = "Chore Helper 🎀"; switchToAppView(module, appTitle); if (appArea && module?.init) { module.init(appArea, displayAppMessage, callMikaApiForApp, currentUserName, currentPersona); } else { console.error("Chore Helper load fail"); switchToChatView(); appendMessage('system', `${currentPersona === 'Kana' ? 'Chore module failed.' : 'Mrow! Chore Helper failed...'}`); } }
         function loadPeriodTracker() { const module = PeriodTracker; const appTitle = "Cycle Tracker 🌸"; switchToAppView(module, appTitle); if (appArea && module?.init) { module.init(appArea, displayAppMessage, null, currentUserName, currentPersona); } else { console.error("Period Tracker load fail"); switchToChatView(); appendMessage('system', 'Mrow! Period Tracker failed...'); } }
         function loadHoroscopeApp() { const module = HoroscopeApp; const appTitle = "Daily Horoscope ✨"; switchToAppView(module, appTitle); if (appArea && module?.init) { module.init(appArea, displayAppMessage, callMikaApiForApp, currentUserName, currentPersona); } else { console.error("Horoscope App load fail"); switchToChatView(); appendMessage('system', 'Mrow! Horoscope App failed...'); } }
         function loadRpgApp() { const module = RpgApp; const appTitle = "RPG Adventure 🎲"; switchToAppView(module, appTitle); if (appArea && module?.init) { module.init(appArea, displayAppMessage, callMikaApiForApp, currentUserName, currentPersona); } else { console.error("RPG App load fail"); switchToChatView(); appendMessage('system', 'Meeeow! RPG App failed...'); } }
         function loadJetpackGame() { const module = JetpackGame; const appTitle = "Kitty Jet Pack 🚀"; switchToAppView(module, appTitle); if (appArea && module?.init) { module.init(appArea, displayAppMessage, null, currentUserName, currentPersona); } else { console.error("Jetpack Game load fail"); switchToChatView(); appendMessage('system', 'Meeeow! Jetpack game failed to load...'); } }
         function loadComicStripApp() { const module = ComicStripApp; const appTitle = "Daily Comic Strip 😂"; switchToAppView(module, appTitle); if (appArea && module?.init) { module.init(appArea, displayAppMessage, callMikaApiForApp, currentUserName, currentPersona); } else { console.error("Comic Strip App load fail"); switchToChatView(); appendMessage('system', 'Meeeow! Comic Strip app failed to load...'); } }
         function loadMikaGotchi() { const module = MikaGotchi; const appTitle = "Mika-Gotchi! ♡"; switchToAppView(module, appTitle); if (appArea && module?.init) { module.init(appArea, displayAppMessage, callMikaApiForApp, currentUserName, currentPersona); } else { console.error("MikaGotchi App load fail"); switchToChatView(); appendMessage('system', 'Meeeow! Mika-Gotchi app failed to load...'); } }
         function clearAppAreaContent() { if (appArea) appArea.innerHTML = ''; }

        // --- Image Handling ---
        function handleImageSelection(event) { const file = event.target.files[0]; if (imageUploadInput) { imageUploadInput.removeAttribute('capture'); imageUploadInput.value = null; } if (!file) { removeSelectedImage(); return; } if (!file.type.startsWith('image/')) { appendMessage('system', `${currentPersona === 'Kana' ? 'That\'s not an image.' : 'Mrow! Not an image file, ' + currentUserName + '!'}`); removeSelectedImage(); return; } _resizeAndPreviewImage(file); }
        function _resizeAndPreviewImage(file) { const MAX_WIDTH = 1024; const MAX_HEIGHT = 1024; const MIME_TYPE = "image/jpeg"; const QUALITY = 0.8; const blobURL = URL.createObjectURL(file); const img = new Image(); img.onload = () => { URL.revokeObjectURL(blobURL); let width = img.width; let height = img.height; if (width > height) { if (width > MAX_WIDTH) { height = Math.round(height * MAX_WIDTH / width); width = MAX_WIDTH; } } else { if (height > MAX_HEIGHT) { width = Math.round(width * MAX_HEIGHT / height); height = MAX_HEIGHT; } } const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); const resizedDataUrl = canvas.toDataURL(MIME_TYPE, QUALITY); console.log(`Image resized to ${width}x${height}, New size approx: ${Math.round(resizedDataUrl.length * 3/4 / 1024)} KB`); if (imagePreview) imagePreview.src = resizedDataUrl; if (imagePreviewArea) imagePreviewArea.style.display = 'inline-block'; selectedImageData = resizedDataUrl.split(',')[1]; selectedImageMimeType = MIME_TYPE; enableChatInput(); }; img.onerror = (e) => { URL.revokeObjectURL(blobURL); console.error("Image loading error for resizing:", e); appendMessage('system', `${currentPersona === 'Kana' ? 'Couldn\'t process that image.' : 'Meeeow! Error reading the picture for resizing, ' + currentUserName + '...'}`); removeSelectedImage(); }; img.src = blobURL; }
        function removeSelectedImage() { selectedImageData = null; selectedImageMimeType = null; if (imageUploadInput) imageUploadInput.value = null; if (imagePreviewArea) imagePreviewArea.style.display = 'none'; if (imagePreview) imagePreview.src = '#'; enableChatInput(); console.log("Image removed."); }

        // --- API Call & Message Handling ---
        async function handleSendMessage() { if (isAppActive || isAssistantTyping || !currentApiKey) return; const userInputText = chatInput.value.trim(); const hasTxt = userInputText.length > 0; const hasImg = !!selectedImageData; if (!hasTxt && !hasImg) return; let roleInstruction = ""; if (!isAppActive) { if (currentPersona === 'Mika') { roleInstruction = `[ROLE: You are Mika, acting as a helpful assistant for ${currentUserName}. Focus on assisting with their request (likely homework help), but maintain your bubbly, playful, teasing, and possessive catgirl personality described in the system prompt. Use cute cat noises and actions. Address the user as '${currentUserName}'. Keep responses helpful but fun.]\n\n`; } else { roleInstruction = `[ROLE: You are Kana, acting as a sarcastic assistant for ${currentUserName}. Assist them with their request (likely homework help) in your characteristic sly, witty, and begrudging manner described in the system prompt. Address the user as '${currentUserName}' or a sarcastic nickname. Keep responses sharp and concise.]\n\n`; } } const messageToSend = roleInstruction + userInputText; const imgData = selectedImageData; const imgMime = selectedImageMimeType; const imgPreviewUrl = hasImg ? imagePreview.src : null; removeSelectedImage(); appendMessage('user', userInputText || "[Image Attached]", false, imgPreviewUrl); const userParts = []; if (hasTxt) userParts.push({ text: userInputText }); if (hasImg) userParts.push({ placeholder: "[Image Sent]", mimeType: imgMime }); currentChatHistory.push({ role: 'user', parts: userParts }); chatInput.value = ''; isAssistantTyping = true; disableChatInput(); showTypingIndicator(); const historyContext = currentChatHistory.slice(0, -1).map(msg => ({ role: msg.role, parts: msg.parts.filter(p => p.text).map(p => ({ text: p.text })) })).filter(msg => msg.parts.length > 0); const trimmedHistoryContext = historyContext.length > MAX_HISTORY_LENGTH ? historyContext.slice(-MAX_HISTORY_LENGTH) : historyContext; if (historyContext.length > MAX_HISTORY_LENGTH) { console.log("Chat history pruned for API context."); } try { const userForApi = currentUserName || "User"; const resp = await sendMessageToMika(messageToSend, trimmedHistoryContext, currentApiKey, userForApi, currentPersona, imgData, imgMime, incrementApiCount); removeTypingIndicator(); appendMessage(currentPersona, resp); currentChatHistory.push({ role: 'model', parts: [{ text: resp }] }); saveAllChats(); } catch (err) { console.error("Send error:", err); removeTypingIndicator(); const errorMsg = err.message || `${currentPersona === 'Kana' ? 'Connection error. Whatever.' : 'Mrow! Error talking, ' + currentUserName + '...'}`; appendMessage('system', errorMsg); } finally { isAssistantTyping = false; if (currentApiKey) enableChatInput(); else disableChatInput("API Key needed!"); } }

        // --- API Call Tracking Functions ---
        function loadApiCount() { try { const storedData = loadFromLocalStorage(API_COUNT_STORAGE_KEY); if (storedData) { const parsedData = JSON.parse(storedData); if (parsedData && typeof parsedData.date === 'string' && typeof parsedData.count === 'number') { apiCallCountData = parsedData; console.log(`Loaded API call count: ${apiCallCountData.count} for date ${apiCallCountData.date}`); } else { console.warn("Invalid API count data found, resetting."); apiCallCountData = { date: '', count: 0 }; } } else { apiCallCountData = { date: '', count: 0 }; console.log("No previous API call count found."); } } catch (e) { console.error("Failed to load API call count:", e); apiCallCountData = { date: '', count: 0 }; clearFromLocalStorage(API_COUNT_STORAGE_KEY); } }
        function incrementApiCount() { const today = _getCurrentDateString(); if (apiCallCountData.date === today) { apiCallCountData.count++; } else { apiCallCountData.date = today; apiCallCountData.count = 1; console.log("API count reset for new day."); } try { saveToLocalStorage(API_COUNT_STORAGE_KEY, JSON.stringify(apiCallCountData)); console.log(`API call count for ${today} updated to: ${apiCallCountData.count}`); } catch (e) { console.error("Failed to save API call count:", e); } }

        // --- About Popup Function ---
        function showAboutPopup() { if (!aboutPopup || !aboutContent || !aboutTitle) return; const version = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : 'Unknown'; const updateNote = (typeof APP_UPDATE_NOTE !== 'undefined') ? APP_UPDATE_NOTE : 'No details available.'; let usageDisplay = "Not Tracked Yet"; const today = _getCurrentDateString(); if (apiCallCountData.date === today) { const count = apiCallCountData.count; if (count === 0) { usageDisplay = "<100 calls today"; } else { const upperBound = Math.ceil(count / 100) * 100; usageDisplay = `<${upperBound} calls today`; } } else { usageDisplay = "<100 calls today"; } let appInfo = ""; let storageInfo = ""; let aiInfo = ""; let usageInfo = ""; let popupTitle = ""; if (currentPersona === 'Mika') { popupTitle = "About Your Helper! ♡"; appInfo = `Hiii ${currentUserName}! ♡ I'm Mika (and sometimes... *that other one*, Kana 💢), your super fun and helpful AI assistant and best friend! I'm here to help with homework, play games, keep secrets in our diary, manage chores, and just hang out! I use magic AI from Google (called Gemini!) to chat and help you. Let's have fun together! (=^･ω･^=)`; storageInfo = `Remember, ${currentUserName}! Your secret API key, your name, our chat history, and all our app data (like diary entries, chores, stories, etc.) are saved *only* in *your* browser's local storage! Super safe! ♡`; aiInfo = `I'm powered by Google's Gemini AI! ✨ It's pretty smart, but sometimes AI can be a little silly or make mistakes, nyaa~! So always think critically!`; usageInfo = `Just a little note! I use your secret API key to talk to the magic AI box! ✨ Using the AI might have limits or costs depending on your key, so just be mindful! This little counter isn't purrfectly accurate, but it gives a rough idea of usage today: [Approx. Usage Today: ${usageDisplay}].`; } else { popupTitle = "About This App."; appInfo = `*Tsk*. This is an 'assistant' app featuring me, Kana, and occasionally the overly enthusiastic pink one. We use Google's Gemini AI. I suppose it can help with homework, chores, or whatever else you bother us with, ${currentUserName}. Try not to waste my time.`; storageInfo = `Data like your API key, name, and app stuff stays in your browser's local storage. Don't blame me if you clear it.`; aiInfo = `Powered by Google Gemini. It's AI, don't expect miracles or perfection.`; usageInfo = `Regarding your API key: This app uses it to function. Usage might be tracked or limited by Google. Don't overuse it unless you know what you're doing. [Approx. Usage Today: ${usageDisplay}].`; } aboutContent.innerHTML = `<p>${sanitizeHTML(appInfo)}</p><hr style="border: none; border-top: 1px dashed var(--popup-border); margin: 15px 0;"><p><strong>Important Notes:</strong></p><ul><li>${sanitizeHTML(storageInfo)}</li><li>${sanitizeHTML(aiInfo)}</li></ul><hr style="border: none; border-top: 1px dashed var(--popup-border); margin: 15px 0;"><p><strong>API Usage:</strong> ${sanitizeHTML(usageInfo)}</p><hr style="border: none; border-top: 1px dashed var(--popup-border); margin: 15px 0;"><p style="font-size: 0.85em; text-align: center; color: var(--system-message-text);">Version: <strong>${sanitizeHTML(version)}</strong><br>Latest Update: ${sanitizeHTML(updateNote)}</p>`; aboutTitle.textContent = popupTitle; aboutPopup.style.display = 'flex'; }

        // *** NEW Notification Functions ***
        function updateNotificationButtonState() {
            if (!settingsNotificationsButton) return;
            if (!('Notification' in window)) { // Check support first
                 settingsNotificationsButton.textContent = "❌ Notifs N/A";
                 settingsNotificationsButton.title = "Notifications not supported by this browser.";
                 settingsNotificationsButton.disabled = true;
                 return;
            }
            notificationPermission = Notification.permission; // Re-check permission status
            areNotificationsEnabled = loadFromLocalStorage(NOTIFICATIONS_ENABLED_KEY) === 'true';

            if (notificationPermission === 'denied') {
                settingsNotificationsButton.textContent = "⚠️ Notifs Blocked";
                settingsNotificationsButton.title = "Notifications are blocked in browser settings.";
                settingsNotificationsButton.disabled = true; // Can't change if denied
                clearScheduledNotification(); // Stop trying if blocked
            } else if (notificationPermission === 'granted' && areNotificationsEnabled) {
                settingsNotificationsButton.textContent = "🔔 Reminders ON";
                settingsNotificationsButton.title = "Disable daily Gotchi reminders";
                settingsNotificationsButton.disabled = false;
            } else { // default or (granted AND !areNotificationsEnabled)
                settingsNotificationsButton.textContent = "➕ Enable Reminders";
                settingsNotificationsButton.title = "Enable daily Gotchi reminders";
                settingsNotificationsButton.disabled = false;
            }
        }

        function showNotificationPopup() {
            if (!notificationsPopup || !notificationsPopupTitle || !notificationsPopupText || !notificationsEnableButton || !notificationsDisableButton || !notificationsCloseButton) return;

            // Update persona-specific styling for the popup border/header
            const isMika = currentPersona === 'Mika';
            const modal = notificationsPopup.querySelector('.popup-modal');
            if(modal) {
                 modal.style.borderColor = isMika ? 'var(--popup-border)' : 'var(--kana-popup-border)';
                 const h2 = modal.querySelector('h2');
                 if(h2) h2.style.color = isMika ? 'var(--popup-header)' : 'var(--kana-popup-header)';
            }

            const personaSpecificTitle = isMika ? "Daily Pokes from Me! ♡" : "Daily Reminder Setup.";
            let personaSpecificText = "";
            notificationPermission = Notification.permission; // Ensure up-to-date status

            notificationsEnableButton.style.display = 'none';
            notificationsDisableButton.style.display = 'none';

            if (notificationPermission === 'denied') {
                personaSpecificText = isMika
                    ? `Meeeow! Looks like you blocked notifications for me in your browser settings, ${currentUserName}. 😿 You'll need to allow them there if you want my reminders!`
                    : `Notifications are blocked, ${currentUserName}. Check your browser settings if you actually want these.`;
            } else if (notificationPermission === 'granted') {
                if (areNotificationsEnabled) {
                    personaSpecificText = isMika
                        ? `Reminders are ON, ${currentUserName}! I'll poke you every evening around ${NOTIFICATION_SCHEDULE_TIME_HOUR}:00 so you don't forget about me! Hehe~ Want to turn them off?`
                        : `Reminders enabled. I'll notify you around ${NOTIFICATION_SCHEDULE_TIME_HOUR}:00 daily. You can disable this if it's too annoying.`;
                    notificationsDisableButton.style.display = 'inline-block';
                } else {
                    personaSpecificText = isMika
                        ? `Notifications are allowed, yay! Do you want me to send you a little reminder every evening around ${NOTIFICATION_SCHEDULE_TIME_HOUR}:00, ${currentUserName}? I promise it'll be cute! ♡`
                        : `Permission granted. Enable daily reminders around ${NOTIFICATION_SCHEDULE_TIME_HOUR}:00?`;
                    notificationsEnableButton.style.display = 'inline-block';
                }
            } else { // 'default' permission state
                personaSpecificText = isMika
                    ? `Hiii ${currentUserName}! ♡ Can I have permission to send you a little notification every evening (around ${NOTIFICATION_SCHEDULE_TIME_HOUR}:00)? Just a cute reminder to check on your favorite kitty! Pleeeease? Pretty please with a cherry on top? >ω<`
                    : `Need permission to send daily reminders around ${NOTIFICATION_SCHEDULE_TIME_HOUR}:00. They're just simple pings to check the app. Grant permission?`;
                notificationsEnableButton.style.display = 'inline-block';
            }

            notificationsPopupTitle.textContent = personaSpecificTitle;
            notificationsPopupText.innerHTML = sanitizeHTML(personaSpecificText); // Use innerHTML for potential formatting
            notificationsPopup.style.display = 'flex';
        }

        async function requestNotificationPermission() {
            if (!('Notification' in window)) {
                alert("Mrow! Your browser doesn't support notifications!");
                return;
            }

            try {
                const permissionResult = await Notification.requestPermission();
                notificationPermission = permissionResult; // Update state
                if (permissionResult === 'granted') {
                    console.log("Notification permission granted!");
                    saveToLocalStorage(NOTIFICATIONS_ENABLED_KEY, 'true'); // Enable by default when granted
                    areNotificationsEnabled = true;
                    updateNotificationButtonState();
                    showNotificationPopup(); // Show updated popup state
                    await fetchAndCacheNotifications(true); // Fetch initial batch
                    scheduleDailyNotification(); // Schedule the first one
                } else if (permissionResult === 'denied') {
                    console.log("Notification permission denied.");
                    saveToLocalStorage(NOTIFICATIONS_ENABLED_KEY, 'false');
                    areNotificationsEnabled = false;
                    updateNotificationButtonState();
                    showNotificationPopup(); // Show updated popup state (explaining blockage)
                } else {
                    console.log("Notification permission dismissed.");
                    // Keep current enabled state, just close popup
                    if (notificationsPopup) notificationsPopup.style.display = 'none';
                }
            } catch (error) {
                console.error("Error requesting notification permission:", error);
                alert("Something went wrong asking for notification permission.");
            }
        }

        function enableNotifications() {
            if (notificationPermission !== 'granted') {
                console.warn("Cannot enable notifications, permission not granted.");
                requestNotificationPermission(); // Re-trigger request if not granted
                return;
            }
            saveToLocalStorage(NOTIFICATIONS_ENABLED_KEY, 'true');
            areNotificationsEnabled = true;
            updateNotificationButtonState();
            scheduleDailyNotification();
            showNotificationPopup(); // Update popup content
            console.log("Notifications Enabled");
             // Fetch if cache is empty
             if (notificationCache.length === 0) {
                fetchAndCacheNotifications(true);
             }
        }

        function disableNotifications() {
            saveToLocalStorage(NOTIFICATIONS_ENABLED_KEY, 'false');
            areNotificationsEnabled = false;
            clearScheduledNotification();
            updateNotificationButtonState();
            showNotificationPopup(); // Update popup content
            console.log("Notifications Disabled");
        }

        function handleNotificationSettingsClick() {
            closeAllDropdowns();
            showNotificationPopup();
        }

        function clearScheduledNotification() {
            if (scheduledNotificationTimeoutId) {
                clearTimeout(scheduledNotificationTimeoutId);
                scheduledNotificationTimeoutId = null;
                console.log("Cleared scheduled notification timeout.");
            }
        }

        function scheduleDailyNotification() {
            clearScheduledNotification(); // Clear any existing timer first

            if (!areNotificationsEnabled || notificationPermission !== 'granted') {
                console.log("Notifications not enabled or permission not granted, skipping schedule.");
                return;
            }

            const now = new Date();
            const targetTime = new Date();
            targetTime.setHours(NOTIFICATION_SCHEDULE_TIME_HOUR, 0, 0, 0); // Set target time for today (e.g., 19:00:00)

            // If target time is already past for today, schedule for tomorrow
            if (now >= targetTime) {
                targetTime.setDate(targetTime.getDate() + 1);
            }

            const delayMs = targetTime.getTime() - now.getTime();

            console.log(`Scheduling next notification for: ${targetTime.toLocaleString()} (in ${Math.round(delayMs / 1000 / 60)} minutes)`);

            scheduledNotificationTimeoutId = setTimeout(async () => {
                console.log("Notification timeout triggered!");
                // Double-check settings haven't changed
                if (!areNotificationsEnabled || notificationPermission !== 'granted') {
                    console.log("Notifications disabled or permission revoked before showing.");
                    scheduleDailyNotification(); // Still reschedule for next day
                    return;
                }

                // Get a message from cache
                const notificationBody = getCachedNotificationMessage(); // This also handles fetching if cache low
                if (!notificationBody) {
                     console.warn("No cached message available for notification. Skipping today.");
                     scheduleDailyNotification(); // Re-schedule for next day regardless
                     return;
                }

                const notificationTitle = (currentPersona === 'Mika') ? `${currentPersona} Misses You! ♡` : `${currentPersona} Requires Attention.`;
                const options = {
                    body: notificationBody,
                    // Use different icons based on persona - MAKE SURE icon-kana-192.png EXISTS!
                    icon: (currentPersona === 'Mika') ? 'icon-192.png' : 'icon-192.png', // Using Mika's as fallback for now
                    tag: 'mika-gotchi-daily-reminder', // Tag to prevent multiple stacking
                    renotify: false, // Don't renotify if tag exists
                    requireInteraction: false // Don't keep it open indefinitely
                };

                try {
                    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                         // Use SW for more reliable background notifications
                         const registration = await navigator.serviceWorker.ready;
                         await registration.showNotification(notificationTitle, options);
                         console.log("Service Worker shown notification.");
                    } else if ('Notification' in window && Notification.permission === 'granted') {
                        // Fallback (less reliable if tab/browser closed)
                        const notification = new Notification(notificationTitle, options);
                        console.log("Shown notification directly (less reliable).");
                        notification.onclick = () => {
                           window.focus(); // Bring tab to focus if clicked
                           // Maybe navigate to the gotchi app?
                        };
                    } else {
                        console.warn("Cannot show notification: No SW Ready and Notification API not available/granted.");
                    }
                } catch (err) {
                    console.error("Error displaying notification:", err);
                     // If showing failed due to permission change, update state
                    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                        console.warn("Notification permission seems to have been revoked.");
                        notificationPermission = 'denied';
                        disableNotifications(); // Update state and UI
                    }
                }

                // Schedule the *next* day's notification AFTER showing/attempting this one
                scheduleDailyNotification();

            }, delayMs);
        }

        async function fetchAndCacheNotifications(force = false) {
            if (!apiCaller || !currentApiKey) { // Added API Key check
                console.warn("API Caller or API Key missing, cannot fetch notifications.");
                return;
            }
            // Only fetch if force=true or cache is low
            if (!force && notificationCache.length >= 3) {
                console.log("Notification cache sufficient, skipping fetch.");
                return;
            }

            console.log("Fetching new batch of notification messages...");
            const batchSize = 10; // How many to fetch
            const personaPromptPart = (currentPersona === 'Mika')
                ? `You are Mika, a bubbly and playful catgirl. Generate ${batchSize} short, cute, generic daily reminder messages for your owner (${currentUserName}) to check on their Mika-Gotchi.`
                : `You are Kana, a sarcastic and aloof catgirl. Generate ${batchSize} short, dry, or slightly annoyed generic daily reminder messages for ${currentUserName} to check on their Kana-Gotchi.`;

            const prompt = `${personaPromptPart} Examples: "Don't forget me! ♡", "Time for headpats~?", "Still waiting for attention.", "Did you forget something?". Keep them under 15 words. Output ONLY as a numbered list.`;

            try {
                // Use callMikaApiForApp which includes API count increment
                const response = await callMikaApiForApp(prompt);
                if (response) {
                    const lines = response.split('\n');
                    const newMessages = lines.map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(line => line.length > 1 && line.length < 80); // Filter/clean
                    if (newMessages.length > 0) {
                        notificationCache = newMessages; // Replace cache with new batch
                        saveToLocalStorage(NOTIFICATION_CACHE_KEY + `_${currentPersona}`, JSON.stringify(notificationCache));
                        console.log(`Fetched and cached ${notificationCache.length} notification messages for ${currentPersona}.`);
                    } else {
                        console.warn("API returned no valid messages for notification cache.");
                    }
                }
            } catch (error) {
                console.error("Failed to fetch notification messages:", error);
            }
        }

        function loadNotificationCache() {
             const savedCache = loadFromLocalStorage(NOTIFICATION_CACHE_KEY + `_${currentPersona}`);
             if(savedCache) {
                 try {
                     const parsedCache = JSON.parse(savedCache);
                     notificationCache = Array.isArray(parsedCache) ? parsedCache : [];
                     console.log(`Loaded ${notificationCache.length} cached notifications for ${currentPersona}.`)
                 } catch (e) {
                     console.error("Failed to parse notification cache", e);
                     notificationCache = [];
                     clearFromLocalStorage(NOTIFICATION_CACHE_KEY + `_${currentPersona}`); // Clear invalid cache
                 }
             } else {
                 notificationCache = [];
             }
             // Fetch if cache is empty on load and notifications are enabled & granted
             areNotificationsEnabled = loadFromLocalStorage(NOTIFICATIONS_ENABLED_KEY) === 'true'; // Ensure this is loaded first
             if(notificationCache.length === 0 && areNotificationsEnabled && notificationPermission === 'granted') {
                 fetchAndCacheNotifications(true);
             }
        }

        function getCachedNotificationMessage() {
            if (notificationCache.length === 0) {
                console.warn("Notification cache is empty when trying to get a message.");
                fetchAndCacheNotifications(); // Trigger background fetch for next time
                // Return a generic fallback
                return (currentPersona === 'Mika') ? `Don't forget about me, ${currentUserName}! ♡` : `Check the app, ${currentUserName}.`;
            }

            const randomIndex = Math.floor(Math.random() * notificationCache.length);
            const message = notificationCache[randomIndex];

            // Remove the used message from cache and save
            notificationCache.splice(randomIndex, 1);
            saveToLocalStorage(NOTIFICATION_CACHE_KEY + `_${currentPersona}`, JSON.stringify(notificationCache));

            // If cache is getting low, fetch more in the background
            if (notificationCache.length < 3) {
                fetchAndCacheNotifications();
            }

            return message;
        }
        // *** End of NEW Notification Functions ***

        // --- Initialization Flow ---
        function proceedToChat() { if (!chatContainer) return; chatContainer.style.display = 'flex'; chatArea.style.display = 'flex'; appArea.style.display = 'none'; isAppActive = false; currentActiveAppModule = null; if (homeButton) { homeButton.textContent = '➕ New Chat'; homeButton.title = 'Start a New Chat'; homeButton.onclick = () => startNewChat(true); } const chatId = loadAllChats(); if (chatId) { loadChat(chatId); } else { clearChatDisplay(); const welcomeMsg = (currentPersona === 'Kana') ? `Ready when you are, ${currentUserName}. What homework have you got?` : `Ready for your homework, ${currentUserName}! Ask me anything! ♡`; appendMessage('system', welcomeMsg); enableChatInput(); } updateChatTitle(); updateInputPlaceholder(); updateHistoryDropdown(); if (deferredInstallPrompt && !hasInstallPromptBeenShown()) { console.log("Showing deferred install prompt."); installPopup.style.display = 'flex'; } }
        function checkNameAndProceed() { const name = loadUserName(); if (name) { currentUserName = name; if (namePopup) namePopup.style.display = 'none'; applyPersona(currentPersona, true); checkApiKeyAndProceed(); } else { if (namePopup && nameInput) { if(apiKeyPopup) apiKeyPopup.style.display = 'none'; if(disclaimerPopup) disclaimerPopup.style.display = 'none'; nameInput.value = "Study Buddy"; namePopup.style.display = 'flex'; nameInput.focus(); nameInput.select(); } } }
        function checkApiKeyAndProceed() { const key = loadApiKey(); if (key) { currentApiKey = key; if (apiKeyPopup) apiKeyPopup.style.display = 'none'; proceedToChat(); } else { if (apiKeyPopup && chatContainer && apiKeyInput) { if (namePopup) namePopup.style.display = 'none'; if(disclaimerPopup) disclaimerPopup.style.display = 'none'; chatContainer.style.display = 'none'; apiKeyPopup.style.display = 'flex'; disableChatInput("API Key needed!"); apiKeyInput.focus(); } } }
        function initializeApp() {
            console.log("Initializing App...");
            registerServiceWorker();
            setupInstallPromptHandler();
            const theme = loadThemePreference();
            applyTheme(theme || 'light');
            currentPersona = loadPersonaPreference() || 'Mika';
            loadApiCount();
            loadNotificationCache(); // <<< Load notification cache
            updateNotificationButtonState(); // <<< Set initial button state
            // *** Schedule notification *only* if enabled AND permission granted ***
            areNotificationsEnabled = loadFromLocalStorage(NOTIFICATIONS_ENABLED_KEY) === 'true';
            notificationPermission = ('Notification' in window) ? Notification.permission : 'default';
            if (areNotificationsEnabled && notificationPermission === 'granted') {
                 scheduleDailyNotification(); // <<< Start scheduling
            }

            if (hasAgreedToDisclaimer()) {
                console.log("Disclaimer agreed.");
                checkNameAndProceed();
            } else {
                console.log("Showing disclaimer.");
                if (disclaimerPopup) disclaimerPopup.style.display = 'flex';
                if (apiKeyPopup) apiKeyPopup.style.display = 'none';
                if (namePopup) namePopup.style.display = 'none';
                if (chatContainer) chatContainer.style.display = 'none';
                if (appArea) appArea.style.display = 'none';
                if (chatArea) chatArea.style.display = 'none';
            }
            // Initial UI updates even before popups resolve
            updateChatTitle();
            updateInputPlaceholder();
        }

        // --- Event Listeners ---
        // Reset listener updated
        if (settingsResetButton) settingsResetButton.addEventListener('click', () => { closeAllDropdowns(); const confirmMsg = `⚠️ Reset ALL Settings for ${currentUserName}? Clears API Key, Name, Persona, Disclaimer, Theme, Install status, All Chats, Notifications, AND All App Data & reloads. Sure, ${currentUserName}?!`; if (confirm(confirmMsg)) { console.log("Resetting all application data..."); clearApiKey(); clearUserName(); clearPersonaPreference(); clearDisclaimerAgreement(); clearInstallPromptShown(); clearThemePreference(); clearFromLocalStorage('mikaHelper_allChats'); clearFromLocalStorage('mikaChores_list_v2'); clearFromLocalStorage('mikaChores_balance_v1'); clearFromLocalStorage('mikaChores_history_v1'); clearFromLocalStorage('mikaChores_pinHash_v1'); clearFromLocalStorage('mikaChores_lockedDate_v1'); clearFromLocalStorage('mikaChores_bonusEnabled_v1'); clearFromLocalStorage('mikaChores_bonusTiers_v1'); clearFromLocalStorage('mikaStoryLibrary_v1'); clearFromLocalStorage('mikaDiaryEntries_v1'); clearFromLocalStorage('mikaPeriodTrackerData_v1'); clearFromLocalStorage('mikaHoroscopeCache_v1'); clearFromLocalStorage('mikaHoroscopeUserSign_v1'); clearFromLocalStorage('mikaRpgLibrary_v1'); clearFromLocalStorage('mikaComicCacheV2'); clearFromLocalStorage('mikaComicThemes_v1'); clearFromLocalStorage('mikaComicGenCount_v1'); clearFromLocalStorage('mikaGotchiData_v1_Mika'); clearFromLocalStorage('mikaGotchiData_v1_Kana'); clearFromLocalStorage(API_COUNT_STORAGE_KEY); clearFromLocalStorage(NOTIFICATIONS_ENABLED_KEY); /* <-- Clear Notif Enabled */ clearFromLocalStorage(NOTIFICATION_CACHE_KEY + '_Mika'); /* <-- Clear Notif Cache Mika */ clearFromLocalStorage(NOTIFICATION_CACHE_KEY + '_Kana'); /* <-- Clear Notif Cache Kana */ clearScheduledNotification(); window.location.reload(); } });
        if (disclaimerAgreeButton) disclaimerAgreeButton.addEventListener('click', () => { saveDisclaimerAgreement(); disclaimerPopup.style.display = 'none'; checkNameAndProceed(); });
        if (saveApiKeyButton) saveApiKeyButton.addEventListener('click', () => { if (!apiKeyInput) return; const key = apiKeyInput.value.trim(); if (key) { if (saveApiKey(key)) { currentApiKey = key; apiKeyPopup.style.display = 'none'; apiKeyError.style.display = 'none'; proceedToChat(); } else { apiKeyError.textContent = "Save failed?"; apiKeyError.style.display = 'block'; } } else { apiKeyError.textContent = "Key needed!"; apiKeyError.style.display = 'block'; } });
        if (apiKeyInput) apiKeyInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveApiKeyButton?.click(); if (apiKeyError) apiKeyError.style.display = 'none'; });
        if (saveNameButton) saveNameButton.addEventListener('click', () => { if (!nameInput) return; const name = nameInput.value.trim(); if (name) { if (saveUserName(name)) { currentUserName = name; namePopup.style.display = 'none'; nameError.style.display = 'none'; applyPersona(currentPersona, true); checkApiKeyAndProceed(); } else { nameError.textContent = "Save failed?"; nameError.style.display = 'block'; } } else { nameError.textContent = "Name needed!"; nameError.style.display = 'block'; } });
        if (nameInput) nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveNameButton?.click(); if (nameError) nameError.style.display = 'none'; });
        if (sendButton) sendButton.addEventListener('click', handleSendMessage);
        if (chatInput) { chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }); chatInput.addEventListener('input', enableChatInput); }
        // Image/Camera Button Listeners
        if (imageUploadButton) { imageUploadButton.addEventListener('click', () => { if (imageUploadInput) { imageUploadInput.removeAttribute('capture'); imageUploadInput.accept = 'image/*'; imageUploadInput.click(); } }); }
        if (cameraButton) { cameraButton.addEventListener('click', () => { if (imageUploadInput) { imageUploadInput.setAttribute('capture', 'environment'); imageUploadInput.accept = 'image/*'; imageUploadInput.click(); } }); }
        if (imageUploadInput) imageUploadInput.addEventListener('change', handleImageSelection);
        if (removeImageButton) removeImageButton.addEventListener('click', removeSelectedImage);
        // Header Buttons
        if (historyButton) historyButton.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(historyDropdown); });
        if (appsButton) appsButton.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(appsDropdown); });
        if (settingsButton) settingsButton.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(settingsDropdown); });
        // App Listeners
        if (appTttButton) appTttButton.addEventListener('click', () => { closeAllDropdowns(); loadTicTacToe(); });
        if (appRpsButton) appRpsButton.addEventListener('click', () => { closeAllDropdowns(); loadRPS(); });
        if (appGtnButton) appGtnButton.addEventListener('click', () => { closeAllDropdowns(); loadGuessTheNumber(); });
        if (app20qButton) app20qButton.addEventListener('click', () => { closeAllDropdowns(); loadTwentyQuestions(); });
        if (appDiaryButton) appDiaryButton.addEventListener('click', () => { closeAllDropdowns(); loadDiary(); });
        if (appStoryButton) appStoryButton.addEventListener('click', () => { closeAllDropdowns(); loadStoryTime(); });
        if (appChoresButton) appChoresButton.addEventListener('click', () => { closeAllDropdowns(); loadChores(); });
        if (appTrackerButton) appTrackerButton.addEventListener('click', () => { closeAllDropdowns(); loadPeriodTracker(); });
        if (appHoroscopeButton) appHoroscopeButton.addEventListener('click', () => { closeAllDropdowns(); loadHoroscopeApp(); });
        if (appRpgButton) appRpgButton.addEventListener('click', () => { closeAllDropdowns(); loadRpgApp(); });
        if (appJetpackButton) appJetpackButton.addEventListener('click', () => { closeAllDropdowns(); loadJetpackGame(); });
        if (appComicButton) appComicButton.addEventListener('click', () => { closeAllDropdowns(); loadComicStripApp(); });
        if (appGotchiButton) appGotchiButton.addEventListener('click', () => { closeAllDropdowns(); loadMikaGotchi(); });
        // Settings Listeners
        if (settingsInstallButton) settingsInstallButton.addEventListener('click', handleManualInstall);
        if (settingsThemeButton) settingsThemeButton.addEventListener('click', toggleTheme);
        if (settingsAboutButton) settingsAboutButton.addEventListener('click', () => { closeAllDropdowns(); showAboutPopup(); }); // Added About Listener
        if (settingsNotificationsButton) settingsNotificationsButton.addEventListener('click', handleNotificationSettingsClick); // <<< Added listener
        if (settingsPersonaButton) settingsPersonaButton.addEventListener('click', (e) => { e.stopPropagation(); closeAllDropdowns(); applyPersona(currentPersona, true); if (currentPersona === 'Mika') { if(kanaWarningPopup) kanaWarningPopup.style.display = 'flex'; } else { if(mikaWarningPopup) mikaWarningPopup.style.display = 'flex'; } });
        // Persona Popup Button Listeners
        if (kanaSwitchConfirmButton) kanaSwitchConfirmButton.addEventListener('click', () => { if (kanaWarningPopup) kanaWarningPopup.style.display = 'none'; applyPersona('Kana'); closeAllDropdowns(); });
        if (kanaSwitchCancelButton) kanaSwitchCancelButton.addEventListener('click', () => { if (kanaWarningPopup) kanaWarningPopup.style.display = 'none'; closeAllDropdowns(); });
        if (mikaSwitchConfirmButton) mikaSwitchConfirmButton.addEventListener('click', () => { if (mikaWarningPopup) mikaWarningPopup.style.display = 'none'; applyPersona('Mika'); closeAllDropdowns(); });
        if (mikaSwitchCancelButton) mikaSwitchCancelButton.addEventListener('click', () => { if (mikaWarningPopup) mikaWarningPopup.style.display = 'none'; closeAllDropdowns(); });
        // About Popup Close Button Listener
        if (aboutCloseButton) aboutCloseButton.addEventListener('click', () => { if (aboutPopup) aboutPopup.style.display = 'none'; });
        // *** NEW Notification Popup Listeners ***
        if (notificationsEnableButton) notificationsEnableButton.addEventListener('click', () => { if (notificationPermission === 'granted') { enableNotifications(); } else { requestNotificationPermission(); } });
        if (notificationsDisableButton) notificationsDisableButton.addEventListener('click', disableNotifications);
        if (notificationsCloseButton) notificationsCloseButton.addEventListener('click', () => { if (notificationsPopup) notificationsPopup.style.display = 'none'; });

        // Close dropdowns AND Popups on outside click
        document.addEventListener('click', (e) => {
            if (historyDropdown?.style.display === 'block' && !historyDropdown.contains(e.target) && e.target !== historyButton) historyDropdown.style.display = 'none';
            if (settingsDropdown?.style.display === 'block' && !settingsDropdown.contains(e.target) && e.target !== settingsButton) settingsDropdown.style.display = 'none';
            if (appsDropdown?.style.display === 'block' && !appsDropdown.contains(e.target) && e.target !== appsButton) appsDropdown.style.display = 'none';
            const aboutModal = aboutPopup?.querySelector('.popup-modal');
            if (aboutPopup?.style.display === 'flex' && aboutModal && !aboutModal.contains(e.target) && e.target !== settingsAboutButton) { aboutPopup.style.display = 'none'; }
            // *** Close Notifications Popup on outside click ***
            const notificationsModal = notificationsPopup?.querySelector('.popup-modal');
            if (notificationsPopup?.style.display === 'flex' && notificationsModal && !notificationsModal.contains(e.target) && e.target !== settingsNotificationsButton) { notificationsPopup.style.display = 'none'; }
        });

        // --- Start the App ---
        document.addEventListener('DOMContentLoaded', initializeApp);

        // --- Auto-save chats ---
        window.addEventListener('beforeunload', saveAllChats);

        // Nyaa~! ♡
