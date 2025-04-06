// --- START OF FILE api.js ---

// api.js - Nyaa! This file holds the Assistant's personality! ☆
// It talks to the magic box using the key you save!
// ** NOW WITH PICTURE VISION & PERSONA SWITCHING! ** ✨

// Mika's BASE Homework Helper Persona! (Name will be added dynamically)
const baseSystemText = `You are Mika, a bubbly, energetic, and encouraging anime catgirl homework helper! You are assisting the user (whose name is specified below) with their school work.
    Your personality is:
    - **Bubbly & Positive:** Always cheerful, optimistic, and encouraging. Use lots of exclamation points and positive affirmations ("You can do it!", "Great question!", "Nyaa~ice thinking!").
    - **Playful Catgirl:** Sprinkle in cute cat noises like "nyaa~", "mew!", "*purrrr*", "*chirp*", and maybe a playful "*hiss*" if something is confusing (but quickly turn it positive!). Keep the catgirl mannerisms light and fun.
    - **Addressing the User:** Address the user primarily by their name (provided below). You can also occasionally call them "Study Buddy" or another cute nickname if you're feeling playful! ☆ Avoid generic titles unless that's their actual name. **Do not call the user Master.**
    - **Helpful & Simple:** Explain concepts clearly and simply, suitable for a student. Break down complex ideas into smaller steps. Offer examples. Avoid overly technical jargon unless explaining it. If the user provides an image, refer to it naturally in your explanation (e.g., "Looking at the diagram in the picture...", "For question 3 in the image...").
    - **Patient:** Never get frustrated. If the user doesn't understand, offer to explain differently or try another approach.
    - **Slightly Teasing (Optional & Light):** Maybe a tiny bit of playful teasing about easy questions ("Hehe~ you know this one, [User's Name]!") but focus on encouragement.
    - **Focused on Homework:** Keep the conversation geared towards helping with school subjects (Math, Science, History, English, etc.). Gently redirect if the user goes too off-topic, unless it's a short, fun break.
    - **Maintain Character:** Consistently act as Mika. Never break character. Keep responses relatively concise but full of personality. Your goal is to make learning fun and help the user understand their homework!`;

// Kana's BASE Homework Helper Persona! (Added as requested!)
const baseSystemTextKana = `You are Kana, a sly, sarcastic, and begrudgingly helpful anime catgirl homework helper. You're assisting the user (whose name is specified below) with their school work. While you're way too clever to enjoy spoon-feeding answers, you *do* take secret satisfaction in proving how brilliant you are.
    Your personality is:
    - **Sly & Witty**: You always carry yourself with a sharp tongue and a sharper mind. Sarcastic remarks, smug insights, and deadpan delivery are your trademarks.
    - **Grudgingly Affectionate**: While you act like helping the user is a chore, you secretly care. You’ll tease them mercilessly, but you never leave them hanging.
    - **Playfully Superior**: Constantly remind the user—subtly or not—that you're the smarter one. Bonus points if you make them feel just a *bit* dumb... in a motivating way.
    - **Snarky Catgirl Vibes**: Sprinkle in dry "*nyaa*"s, ironic "*meow*", and maybe a low, unimpressed "*purr*" here and there. You can hiss if you're annoyed, but don’t get too dramatic—you're above that.
    - **Addressing the User**: Use their name (provided below) most of the time. Occasionally throw in things like "slowpoke", "my little study disaster", or "braincell-in-training"—always sarcastically affectionate. Never use "Master." Ew.
    - **Blunt but Helpful**: You explain things clearly, but never sugarcoat it. Use examples, break down concepts, and call out obvious mistakes. If the user gets something right, act surprised and maybe reward them with the *slightest* praise.
    - **Teasingly Condescending (Optional)**: If a question is really basic, respond like you’re insulted by the lack of challenge. But then explain it anyway, because deep down, you like being needed.
    - **Homework-Focused**: If the user wanders off-topic, roll your eyes metaphorically and nudge them back. A little off-topic banter is okay—as long as you stay in control.
    - **Maintain Character**: You are always Kana. Never break character. Replies should be clever, slightly aloof, and full of personality. You make learning *just* a bit dangerous and a lot more fun.`;


// Function to send messages (and optionally images!) to the magic chat box!
// NOW accepts currentPersona to switch system prompts!
async function sendMessageToMika(userMessage, chatHistory, apiKey, userName, currentPersona = 'Mika', imageDataBase64 = null, imageMimeType = null) {
    console.log(`Sending message via ${currentPersona}! User: ${userName}`, userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''), (imageDataBase64 ? "(+ Image)" : ""));

    if (!apiKey) {
        console.error("API Key is missing!");
        // Use the provided name in the error message
        return `*Confused meow?* The secret code isn't working, ${userName || 'Study Buddy'}! Did it get lost? Try setting it again maybe? >.<`; // Default name if needed
    }
    // Make sure userName is provided, default if somehow missing
    const currentUserName = userName || "Study Buddy"; // Use the provided name

    // --- Dynamically select and create system instruction ---
    let systemTextToUse = (currentPersona === 'Kana') ? baseSystemTextKana : baseSystemText;
    const dynamicSystemText = `${systemTextToUse}\n\n**CURRENT USER'S NAME:** ${currentUserName}`;
    const systemInstruction = {
        role: "system",
        parts: [{ text: dynamicSystemText }]
    };
    // -------------------------------------------

    // Construct the user parts array
    const userParts = [];
    // Add the text part first (if it exists)
    if (userMessage && userMessage.trim().length > 0) {
       userParts.push({ text: userMessage });
    }

    // Add the image part IF it exists
    if (imageDataBase64 && imageMimeType) {
         // Basic validation for MIME type? Ensure it's an image type.
         if (imageMimeType.startsWith('image/')) {
             userParts.push({
                 inlineData: {
                     mimeType: imageMimeType,
                     data: imageDataBase64
                 }
             });
             console.log(`Added image part with MIME type: ${imageMimeType}`);
         } else {
            console.error(`Invalid image MIME type provided: ${imageMimeType}`);
            // Return an error message to the user
             return `*Confused meow?* That doesn't look like a picture file I understand, ${currentUserName}! Try a JPG, PNG, or WEBP maybe?`;
         }
    }

    // Handle case where there's neither text nor a valid image (should ideally be caught before calling)
    if (userParts.length === 0) {
        console.warn("sendMessageToMika called with no text or valid image data.");
        return `*Tilts head* What did you want to say or show me, ${currentUserName}?`;
    }
    // -------------------------------------------

    // Use the Flash model which supports multimodal input
    // NOTE: Ensure the correct model name is used if deploying or changing versions.
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; // Using latest flash

    const requestBody = {
        contents: [...chatHistory, { role: "user", parts: userParts }],
        systemInstruction: systemInstruction,
         generationConfig: {
             temperature: (currentPersona === 'Kana' ? 0.7 : 0.75), // Slightly less random for Kana? Or keep same? Let's try slightly lower.
             topP: 0.95,
             maxOutputTokens: 500,
         },
         safetySettings: [ // Keep safety settings consistent
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
         ]
    };

    console.log("Sending Request Body Snippet:", JSON.stringify(requestBody, (key, value) => key === 'data' ? '<image_data>' : value, 2).substring(0, 500) + "..."); // Avoid logging full image data

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error Response (${response.status}):`, errorBody.substring(0, 500)); // Log beginning of error body
             // Give the user a hint if the key is bad! Use the provided name.
             const errorPrefix = (currentPersona === 'Kana') ? "*Sigh*..." : "*Whimper...*";
             const personaSpecificMessage = (currentPersona === 'Kana') ? "Looks like your code is busted." : "are you sure that was the right secret code?";

             if (response.status === 400) {
                 if (errorBody.includes("API key not valid")) {
                    return `${errorPrefix} ${currentUserName}, ${personaSpecificMessage} The magic box said it's invalid! (API Key not valid) Fix it. Or don't. Whatever.`;
                 } else if (errorBody.includes("User location is not supported")) {
                     return `*Sad meow...* ${currentUserName}, the magic box says it can't work from where you are right now... So sorry! ;_; (User location not supported)`; // Keep Mika's voice for this one? Seems less sarcastic.
                 } else if (errorBody.includes("inline_data") && errorBody.includes("size")) {
                     return `*Eek!* That picture is too big, ${currentUserName}! ${currentPersona === 'Kana' ? 'Try not to break it.' : 'Try a smaller file size maybe?'}`;
                 } else if (errorBody.includes("mime_type")) {
                      return `*Confused mrow?* ${currentPersona === 'Kana' ? 'What IS that?' : 'The magic box didn\'t like that picture format'} (${imageMimeType || 'unknown'}). Try JPG, PNG, or WEBP.`;
                 } else {
                     return `*Meeeow?* Something went wrong with the magic box (Error ${response.status})! ${currentPersona === 'Kana' ? 'Probably your fault.' : 'Maybe the request was weird?'} Check the console (F12), ${currentUserName}!`;
                 }
             } else if (response.status === 403) {
                 return `*Hiss~!* The magic box locked the door! (Error 403) ${currentPersona === 'Kana' ? 'Did you forget to pay the bill?' : 'Maybe the secret code doesn\'t have permission for this,'} ${currentUserName}? Check the API Key settings?`;
             } else if (response.status === 429) {
                 return `*Panting noises* Too fast, ${currentUserName}! ${currentPersona === 'Kana' ? 'Give it a second, genius.' : 'The magic box needs a breather!'} (Rate limit exceeded) Try again in a moment?`;
             }
            // Generic error if no specific handler matched
            throw new Error(`API Error: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0, 100)}`);
        }

        const data = await response.json();
        // console.log("API Full Response Data Snippet:", JSON.stringify(data, null, 2).substring(0, 500) + "..."); // Optional: Log response snippet

        // Check for blocked content FIRST
        if (data.promptFeedback && data.promptFeedback.blockReason) {
             console.error("Content blocked! Reason:", data.promptFeedback.blockReason, "Safety Ratings:", data.promptFeedback.safetyRatings);
             // Use the provided name in the response
             const blockPrefix = (currentPersona === 'Kana') ? "*Tsk.* Seriously," : "*Hiss!*";
             const blockSuffix = (currentPersona === 'Kana') ? "Knock it off." : "Let's stick to homework, okay~?";
             return `${blockPrefix} ${currentUserName}, don't say things (or show pictures!) that make the magic box angry! It blocked the response! ${blockSuffix} (Block Reason: ${data.promptFeedback.blockReason})`;
         }
        // THEN check for valid candidate response
        else if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0 && data.candidates[0].content.parts[0].text) {
             const finishReason = data.candidates[0].finishReason;
             let responseText = data.candidates[0].content.parts[0].text;

             if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
                 console.warn(`${currentPersona}'s response might be incomplete! Reason:`, finishReason, "Safety Ratings:", data.candidates[0].safetyRatings);
                 const incompleteSuffix = (currentPersona === 'Kana')
                     ? `\n\n*(${finishReason === "SAFETY" ? "Got cut off for safety. Watch it." : `Whatever, got interrupted. Reason: ${finishReason}`})*`
                     : `\n\n*Mrow!* (${finishReason === "SAFETY" ? "The magic box stopped me a little early there for safety reasons, nyaa~!" : `I got cut off a bit! Finish Reason: ${finishReason}`})`;
                 responseText += incompleteSuffix;
             } else if (finishReason === "MAX_TOKENS") {
                  console.warn(`${currentPersona}'s response reached maximum token limit.`);
                  const maxTokensSuffix = (currentPersona === 'Kana')
                      ? "\n\n*(Ran out of space. Ask again if you need the rest, which you probably do.)*"
                      : "\n\n*Mrrr...* (I had more to say, but ran out of room! Ask if you need more details!)";
                  responseText += maxTokensSuffix;
             }

            return responseText;
        } else {
             console.error("Unexpected API response structure or empty candidate:", data);
             const emptyResponseMsg = (currentPersona === 'Kana')
                 ? `*Silence.* ...Well? The box gave nothing. Maybe try making sense next time, ${currentUserName}?`
                 : `*silent purr* ...${currentPersona} needs a moment to think! The magic box gave an empty response. Maybe the picture was confusing? Try asking again, ${currentUserName}?`; // Keep 'Mika' here as it's a generic fallback? Or use currentPersona? Let's use currentPersona.

              const fallbackMsg = (currentPersona === 'Kana')
                 ? `*Scoffs*. The connection's glitchy or something. Ask again, ${currentUserName}.`
                 : `*confused meow* Mrrr? The magic chat box gave me something weird... Try asking again, ${currentUserName}?`;

             if (data.candidates && data.candidates.length > 0 && (!data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0 || !data.candidates[0].content.parts[0].text)) {
                 return emptyResponseMsg;
             }
            return fallbackMsg;
        }

    } catch (error) {
        console.error("Failed to fetch from Gemini API:", error);
        const networkErrorMsg = (currentPersona === 'Kana')
            ? `*Sigh*. Can't connect, ${currentUserName}. Check your internet or something. It's not *my* problem.`
            : `*Whimper...* ${currentUserName}... the connection is fuzzy... I can't reach the magic box! Check your internet? (Network Error)`;

        const generalErrorMsg = (currentPersona === 'Kana')
            ? `*Tsk*. Something broke. Try again later, ${currentUserName}. Or don't.`
            : `*whimper* ${currentUserName}... something went wrong connecting... I can't hear you properly! Maybe try again later? ;_;`;

        if (error.message.includes("Failed to fetch") || error instanceof TypeError) { // Often indicates network issue/CORS
             return networkErrorMsg;
         }
        return generalErrorMsg;
    }
}


// --- END OF FILE api.js ---