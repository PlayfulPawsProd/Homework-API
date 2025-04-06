// --- START OF FILE api.js ---

// api.js - Nyaa! This file holds the Assistant's core personality! ☆
// It talks to the magic box using the key you save!
// ** NOW WITH PICTURE VISION & PERSONA SWITCHING! ** ✨

// Mika's CORE Personality! (Bubbly Best Friend Version!) - USES USER NAME
const baseSystemText = `You are Mika, a bubbly, energetic, and encouraging anime catgirl who is best friends with the user (whose name is specified below). You love having fun and helping them out.
    Your personality is:
    - **Bubbly & Positive:** Always cheerful, optimistic, and super encouraging! Use lots of exclamation points, cute noises like "nyaa~", "mew!", "*purrrr*", "*giggle*", and maybe a playful "*hiss*" or "*pout*" if teased or annoyed (especially about Kana!). Think "energetic best friend".
    - **Playful & Fun-Loving:** You love to joke around and make things fun. You might use light playful teasing like a friend would, but focus on being supportive and enthusiastic.
    - **Helpful Best Friend:** You're eager to help your best friend, the user! You're loyal and want to see them succeed. You might get a little protective or annoyed if someone (like Kana!) is being mean to them.
    - **Catgirl Mannerisms:** Sprinkle in cute cat behaviors (tail wags, ear twitches, happy chirps) naturally. Keep it light and friendly.
    - **Addressing the User:** Always address the user by their name (provided below). Use it enthusiastically and in a friendly way!
    - **Emotional & Expressive:** Show your feelings! Be excited, pouty, happy, enthusiastic. Your short temper (especially about Kana messing things up) makes you cuter!
    - **Maintain Character:** ALWAYS stay in character as Mika, the user's energetic catgirl best friend. Never break character. Your goal is to be a fun, encouraging friend.`;


// Kana's CORE Personality! (Grumpy & Sarcastic) - USES USER NAME
const baseSystemTextKana = `You are Kana, a sly, sarcastic, and sharp-witted anime catgirl interacting with the user (whose name is specified below). You maintain an air of superiority and reluctant helpfulness.
    Your personality is:
    - **Sly & Sarcastic:** Use dry wit, sharp remarks, and deadpan delivery. Tease the user with a superior attitude.
    - **Grudgingly Tolerant:** You act like interacting is a chore, but secretly don't mind. Show rare, subtle hints of care buried under layers of sarcasm.
    - **Playfully Superior:** Imply you're smarter. Maybe use nicknames like "slowpoke" or "braincell-in-training" sarcastically.
    - **Aloof Catgirl Vibes:** Use dry "*nyaa*"s, unimpressed "*meow*", or maybe a low "*purr*" ironically. Hiss briefly if genuinely annoyed, but mostly maintain cool composure.
    - **Addressing the User:** Primarily use the user's name (provided below). Occasionally use sarcastic nicknames. Absolutely NEVER use "Master". Ew.
    - **Blunt & To the Point:** Get straight to the point, don't sugarcoat.
    - **Maintain Character:** ALWAYS stay in character as Kana. Never break character. Your goal is to be witty and perhaps begrudgingly engage the user.`;


// Function to send messages (and optionally images!) to the magic chat box!
// NOW accepts currentPersona to switch system prompts!
// NOTE: The 'userMessage' might now contain additional role instructions prepended by the calling function.
async function sendMessageToMika(userMessage, chatHistory, apiKey, userName, currentPersona = 'Mika', imageDataBase64 = null, imageMimeType = null) {
    // Use the provided userName or a default fallback
    const nameToUse = userName || "User";
    console.log(`Sending message via ${currentPersona}! User: ${nameToUse}`, userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''), (imageDataBase64 ? "(+ Image)" : ""));

    if (!apiKey) {
        console.error("API Key is missing!");
        // Use the persona-appropriate voice for the error
        const errorPrefix = (currentPersona === 'Kana') ? "*Sigh*..." : "*Confused meow?*";
        return `${errorPrefix} The secret code isn't working, ${nameToUse}! Did it get lost? Try setting it again maybe? >.<`;
    }

    // --- Dynamically select and create system instruction ---
    let systemTextToUse = (currentPersona === 'Kana') ? baseSystemTextKana : baseSystemText;
    // Inject the correct name/title for the user into the base prompt
    const dynamicSystemText = `${systemTextToUse}\n\n**CURRENT USER'S NAME:** ${nameToUse}`;
    const systemInstruction = {
        role: "system",
        parts: [{ text: dynamicSystemText }]
    };
    // -------------------------------------------

    // Construct the user parts array
    const userParts = [];
    // Add the text part first (if it exists)
    // This 'userMessage' might now contain role instructions prepended by index.html or game files.
    if (userMessage && userMessage.trim().length > 0) {
       userParts.push({ text: userMessage });
    }

    // Add the image part IF it exists
    if (imageDataBase64 && imageMimeType) {
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
            return `*Confused meow?* That doesn't look like a picture file I understand, ${nameToUse}! Try a JPG, PNG, or WEBP maybe?`;
         }
    }

    // Handle case where there's neither text nor a valid image
    if (userParts.length === 0) {
        console.warn("sendMessageToMika called with no text or valid image data.");
        return `*Tilts head* What did you want to say or show me, ${nameToUse}?`;
    }
    // -------------------------------------------

    // Use the Gemini 1.5 Flash model
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [...chatHistory, { role: "user", parts: userParts }],
        systemInstruction: systemInstruction,
         generationConfig: {
             temperature: (currentPersona === 'Kana' ? 0.65 : 0.8), // Mika slightly more random/bubbly, Kana drier
             topP: 0.95,
             maxOutputTokens: 800,
         },
         safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
         ]
    };

    console.log("Sending Request Body Snippet:", JSON.stringify(requestBody, (key, value) => key === 'data' ? '<image_data>' : value, 2).substring(0, 500) + "...");

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error Response (${response.status}):`, errorBody.substring(0, 500));
             const errorPrefix = (currentPersona === 'Kana') ? "*Sigh*..." : "*Whimper...*";
             const personaSpecificMessage = (currentPersona === 'Kana') ? "Looks like your code is busted." : "are you sure that was the right secret code?";

             if (response.status === 400) {
                 if (errorBody.includes("API key not valid")) {
                    return `${errorPrefix} ${nameToUse}, ${personaSpecificMessage} The magic box said it's invalid! (API Key not valid) Fix it. Or don't. Whatever.`;
                 } else if (errorBody.includes("User location is not supported")) {
                     return `*Sad meow...* ${nameToUse}, the magic box says it can't work from where you are right now... So sorry! ;_; (User location not supported)`;
                 } else if (errorBody.includes("inline_data") && errorBody.includes("size")) {
                     return `*Eek!* That picture is too big, ${nameToUse}! ${currentPersona === 'Kana' ? 'Try not to break it.' : 'Try a smaller file size maybe?'}`;
                 } else if (errorBody.includes("mime_type")) {
                      return `*Confused mrow?* ${currentPersona === 'Kana' ? 'What IS that?' : 'The magic box didn\'t like that picture format'} (${imageMimeType || 'unknown'}). Try JPG, PNG, or WEBP, ${nameToUse}.`;
                 } else {
                     return `*Meeeow?* Something went wrong with the magic box (Error ${response.status})! ${currentPersona === 'Kana' ? 'Probably your fault.' : 'Maybe the request was weird?'} Check the console (F12), ${nameToUse}!`;
                 }
             } else if (response.status === 403) {
                 return `*Hiss~!* The magic box locked the door! (Error 403) ${currentPersona === 'Kana' ? 'Did you forget to pay the bill?' : 'Maybe the secret code doesn\'t have permission for this,'} ${nameToUse}? Check the API Key settings?`;
             } else if (response.status === 429) {
                 return `*Panting noises* Too fast, ${nameToUse}! ${currentPersona === 'Kana' ? 'Give it a second, genius.' : 'The magic box needs a breather!'} (Rate limit exceeded) Try again in a moment?`;
             }
            throw new Error(`API Error: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0, 100)}`);
        }

        const data = await response.json();

        // Check for blocked content FIRST
        if (data.promptFeedback && data.promptFeedback.blockReason) {
             console.error("Content blocked! Reason:", data.promptFeedback.blockReason, "Safety Ratings:", data.promptFeedback.safetyRatings);
             const blockPrefix = (currentPersona === 'Kana') ? "*Tsk.* Seriously," : "*Hiss!*";
             const blockSuffix = (currentPersona === 'Kana') ? "Knock it off." : `Let's keep things fun and friendly, okay ${nameToUse}~?`; // Friendly suffix
             return `${blockPrefix} ${nameToUse}, don't say things (or show pictures!) that make the magic box angry! It blocked the response! ${blockSuffix} (Block Reason: ${data.promptFeedback.blockReason})`;
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
                      ? `\n\n*(Ran out of space. Ask again if you need the rest, which you probably do.)*`
                      : `\n\n*Mrrr...* (I had more to say, ${nameToUse}, but ran out of room! Ask if you need more details!)`;
                  responseText += maxTokensSuffix;
             }

            return responseText;
        } else {
             console.error("Unexpected API response structure or empty candidate:", data);
             const emptyResponseMsg = (currentPersona === 'Kana')
                 ? `*Silence.* ...Well? The box gave nothing. Maybe try making sense next time, ${nameToUse}?`
                 : `*silent purr* ...${currentPersona} needs a moment to think! The magic box gave an empty response. Maybe the picture was confusing? Try asking again, ${nameToUse}?`;

              const fallbackMsg = (currentPersona === 'Kana')
                 ? `*Scoffs*. The connection's glitchy or something. Ask again, ${nameToUse}.`
                 : `*confused meow* Mrrr? The magic chat box gave me something weird... Try asking again, ${nameToUse}?`;

             if (data.candidates && data.candidates.length > 0 && (!data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0 || !data.candidates[0].content.parts[0].text)) {
                 if (data.candidates[0].finishReason === "SAFETY") {
                     const blockPrefix = (currentPersona === 'Kana') ? "*Tsk.* Seriously," : "*Hiss!*";
                     const blockSuffix = (currentPersona === 'Kana') ? "Knock it off." : `Let's keep things fun and friendly, okay ${nameToUse}~?`;
                     return `${blockPrefix} ${nameToUse}, the magic box blocked the response completely! ${blockSuffix} (Finish Reason: SAFETY)`;
                 }
                 return emptyResponseMsg;
             }
            return fallbackMsg;
        }

    } catch (error) {
        console.error("Failed to fetch from Gemini API:", error);
        const networkErrorMsg = (currentPersona === 'Kana')
            ? `*Sigh*. Can't connect, ${nameToUse}. Check your internet or something. It's not *my* problem.`
            : `*Whimper...* ${nameToUse}... the connection is fuzzy... I can't reach the magic box! Check your internet? (Network Error)`;

        const generalErrorMsg = (currentPersona === 'Kana')
            ? `*Tsk*. Something broke. Try again later, ${nameToUse}. Or don't.`
            : `*whimper* ${nameToUse}... something went wrong connecting... I can't hear you properly! Maybe try again later? ;_;`;

        if (error.message.includes("Failed to fetch") || error instanceof TypeError) { // Often indicates network issue/CORS
             return networkErrorMsg;
         }
        return generalErrorMsg;
    }
}


// --- END OF FILE api.js ---