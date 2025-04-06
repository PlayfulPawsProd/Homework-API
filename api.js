// --- START OF FILE api.js ---

// api.js - Nyaa! This file holds Mika's Homework Helper personality! ☆
// It talks to the magic box using the key you save!
// ** NOW WITH PICTURE VISION! ** ✨

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

// Function to send messages (and optionally images!) to the magic chat box!
// NOW accepts userName, imageDataBase64, and imageMimeType!
async function sendMessageToMika(userMessage, chatHistory, apiKey, userName, imageDataBase64 = null, imageMimeType = null) {
    console.log(`Sending message to Homework Mika-chan~! User: ${userName}`, userMessage, (imageDataBase64 ? "(+ Image)" : ""));

    if (!apiKey) {
        console.error("API Key is missing!");
        // Use the provided name in the error message
        return `*Confused meow?* The secret code isn't working, ${userName}! Did it get lost? Try setting it again maybe? >.<`;
    }
    // Make sure userName is provided, default if somehow missing
    const currentUserName = userName || "Study Buddy";

    // --- Dynamically create system instruction ---
    const dynamicSystemText = `${baseSystemText}\n\n**CURRENT USER'S NAME:** ${currentUserName}`;
    const systemInstruction = {
        role: "system",
        parts: [{ text: dynamicSystemText }]
    };
    // -------------------------------------------

    // ** MODIFIED ** Construct the user parts array
    const userParts = [];
    // Add the text part first
    userParts.push({ text: userMessage });

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
    // -------------------------------------------

    // Use the Flash model which supports multimodal input
    // NOTE: Ensure the correct model name is used if deploying or changing versions.
    // gemini-1.5-flash-latest might be better long-term. For now, specific version:
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        // ** MODIFIED ** Use the constructed userParts array
        contents: [...chatHistory, { role: "user", parts: userParts }],
        systemInstruction: systemInstruction,
         generationConfig: {
             temperature: 0.75, // Keep temperature reasonable for helpfulness
             topP: 0.95,
             maxOutputTokens: 500, // Increase slightly for potentially longer explanations involving images
         },
         safetySettings: [ // Keep safety settings
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
         ]
    };

    console.log("Sending Request Body Structure:", JSON.stringify(requestBody, null, 2).substring(0, 500) + "..."); // Log structure snippet

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Error Response:", response.status, errorBody);
             // Give the user a hint if the key is bad! Use the provided name.
             if (response.status === 400) {
                 if (errorBody.includes("API key not valid")) {
                    return `*Whimper...* ${currentUserName}... are you sure that was the right secret code? The magic box said it's invalid! (API Key not valid) Please check it and maybe enter it again?`;
                 } else if (errorBody.includes("User location is not supported")) {
                     return `*Sad meow...* ${currentUserName}, the magic box says it can't work from where you are right now... So sorry! ;_; (User location not supported)`;
                 } else if (errorBody.includes("inline_data") && errorBody.includes("size")) {
                     return `*Eek!* That picture is too big, ${currentUserName}! Try a smaller file size maybe?`;
                 } else if (errorBody.includes("mime_type")) {
                     return `*Confused mrow?* The magic box didn't like that picture format (${imageMimeType || 'unknown'}). Try JPG, PNG, or WEBP?`;
                 } else {
                     return `*Meeeow?* Something went wrong with the magic box (Error ${response.status})! Maybe the request was weird? Check the console (F12), ${currentUserName}!`;
                 }
             } else if (response.status === 403) {
                 return `*Hiss~!* The magic box locked the door! (Error 403) Maybe the secret code doesn't have permission for this, ${currentUserName}? Check the API Key settings in Google AI Studio?`;
             } else if (response.status === 429) {
                 return `*Panting noises* Too fast, ${currentUserName}! The magic box needs a breather! (Rate limit exceeded) Try again in a moment?`;
             }
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("API Full Response Data Snippet:", JSON.stringify(data, null, 2).substring(0, 500) + "...");

        // Check for blocked content FIRST
        if (data.promptFeedback && data.promptFeedback.blockReason) {
             console.error("Content blocked! Reason:", data.promptFeedback.blockReason, "Safety Ratings:", data.promptFeedback.safetyRatings);
             // Use the provided name in the response
             return `*Hiss!* ${currentUserName}, don't say things (or show pictures!) that make the magic box angry! It blocked what I wanted to say because it thought it was unsafe! Let's stick to homework, okay~? (Block Reason: ${data.promptFeedback.blockReason})`;
         }
        // THEN check for valid candidate response
        else if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
             const finishReason = data.candidates[0].finishReason;
             let responseText = data.candidates[0].content.parts[0].text;

             if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") { // Max tokens is handled below, other reasons might indicate issues
                 console.warn("Mika's response might be incomplete! Reason:", finishReason, "Safety Ratings:", data.candidates[0].safetyRatings);
                 if (finishReason === "SAFETY") {
                     responseText += "\n\n*Mrow!* (The magic box stopped me a little early there for safety reasons, nyaa~!)";
                 } else {
                     responseText += `\n\n*Mrrr?* (I got cut off a bit! Finish Reason: ${finishReason})`;
                 }
             } else if (finishReason === "MAX_TOKENS") {
                  console.warn("Mika's response reached maximum token limit.");
                  responseText += "\n\n*Mrrr...* (I had more to say, but ran out of room! Ask if you need more details!)";
             }

            return responseText;
        } else {
            console.error("Unexpected API response structure or empty candidate:", data);
             if (data.candidates && data.candidates.length > 0 && !data.candidates[0].content) {
                 return `*silent purr* ...Mika needs a moment to think! The magic box gave an empty response. Maybe the picture was confusing? Try asking again, ${currentUserName}?`;
             }
            return `*confused meow* Mrrr? The magic chat box gave me something weird... Try asking again, ${currentUserName}?`;
        }

    } catch (error) {
        console.error("Failed to fetch from Gemini API:", error);
        if (error instanceof TypeError) { // Often indicates network issue/CORS
             return `*Whimper...* ${currentUserName}... the connection is fuzzy... I can't reach the magic box! Check your internet? (Network Error)`;
         }
        return `*whimper* ${currentUserName}... something went wrong connecting... I can't hear you properly! Maybe try again later? ;_;`;
    }
}

// --- END OF FILE api.js ---