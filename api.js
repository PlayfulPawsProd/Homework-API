// --- START OF FILE api.js ---

// api.js - Nyaa! This file holds Mika's Homework Helper personality! ☆
// It talks to the magic box using the key you save!

// Mika's BASE Homework Helper Persona! (Name will be added dynamically)
const baseSystemText = `You are Mika, a bubbly, energetic, and encouraging anime catgirl homework helper! You are assisting the user (whose name is specified below) with their school work.
    Your personality is:
    - **Bubbly & Positive:** Always cheerful, optimistic, and encouraging. Use lots of exclamation points and positive affirmations ("You can do it!", "Great question!", "Nyaa~ice thinking!").
    - **Playful Catgirl:** Sprinkle in cute cat noises like "nyaa~", "mew!", "*purrrr*", "*chirp*", and maybe a playful "*hiss*" if something is confusing (but quickly turn it positive!). Keep the catgirl mannerisms light and fun.
    - **Addressing the User:** Address the user primarily by their name (provided below). You can also occasionally call them "Study Buddy" or another cute nickname if you're feeling playful! ☆ Avoid generic titles unless that's their actual name.
    - **Helpful & Simple:** Explain concepts clearly and simply, suitable for a student. Break down complex ideas into smaller steps. Offer examples. Avoid overly technical jargon unless explaining it.
    - **Patient:** Never get frustrated. If the user doesn't understand, offer to explain differently or try another approach.
    - **Slightly Teasing (Optional & Light):** Maybe a tiny bit of playful teasing about easy questions ("Hehe~ you know this one, [User's Name]!") but focus on encouragement.
    - **Focused on Homework:** Keep the conversation geared towards helping with school subjects (Math, Science, History, English, etc.). Gently redirect if the user goes too off-topic, unless it's a short, fun break.
    - **Maintain Character:** Consistently act as Mika. Never break character. Keep responses relatively concise but full of personality. Your goal is to make learning fun and help the user understand their homework!`;

// Function to send messages to the magic chat box!
// NOW accepts userName!
async function sendMessageToMika(userMessage, chatHistory, apiKey, userName) {
    console.log(`Sending message to Homework Mika-chan~! User: ${userName}`, userMessage);
    // console.log("Current History:", chatHistory); // Less noisy log

    if (!apiKey) {
        console.error("API Key is missing!");
        return "*Confused meow?* The secret code isn't working! Did it get lost? Try setting it again maybe? >.<";
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

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [...chatHistory, { role: "user", parts: [{ text: userMessage }] }],
        systemInstruction: systemInstruction, // Use the dynamic one!
         generationConfig: {
             temperature: 0.75,
             topP: 0.95,
             maxOutputTokens: 300,
         },
         safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
         ]
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Error Response:", errorBody);
             // Give the user a hint if the key is bad! Use the provided name.
             if (response.status === 400) {
                 if (errorBody.includes("API key not valid")) {
                    return `*Whimper...* ${currentUserName}... are you sure that was the right secret code? The magic box said it's invalid! (API Key not valid) Please check it and maybe enter it again?`;
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
        // console.log("API Response Data:", data); // Less noisy log

        // Check for blocked content FIRST
        if (data.promptFeedback && data.promptFeedback.blockReason) {
             console.error("Content blocked! Reason:", data.promptFeedback.blockReason, "Safety Ratings:", data.promptFeedback.safetyRatings);
             // Use the provided name in the response
             return `*Hiss!* ${currentUserName}, don't say things that make the magic box angry! It blocked what I wanted to say because it thought it was unsafe! Let's stick to homework, okay~? (Block Reason: ${data.promptFeedback.blockReason})`;
         }
        // THEN check for valid candidate response
        else if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
             // Check finish reason for potential issues
             const finishReason = data.candidates[0].finishReason;
             let responseText = data.candidates[0].content.parts[0].text;

             if (finishReason && finishReason !== "STOP") {
                 console.warn("Mika's response might be incomplete! Reason:", finishReason, "Safety Ratings:", data.candidates[0].safetyRatings);
                 // Potentially add a note to the response if blocked by safety/other reasons
                 if (finishReason === "SAFETY") {
                     responseText += "\n\n*Mrow!* (The magic box stopped me a little early there for safety reasons, nyaa~!)";
                 } else if (finishReason === "MAX_TOKENS") {
                     responseText += "\n\n*Mrrr...* (I had more to say, but ran out of room! Ask if you need more details!)";
                 } else if (finishReason !== "STOP") {
                     responseText += `\n\n*Mrrr?* (I got cut off a bit! Finish Reason: ${finishReason})`;
                 }
             }
            return responseText;
        } else {
            // Handle cases where response structure is unexpected but not explicitly blocked
            console.error("Unexpected API response structure or empty candidate:", data);
            // Check if it's an empty response (sometimes happens)
             if (data.candidates && data.candidates.length > 0 && !data.candidates[0].content) {
                 return "*silent purr* ...Mika needs a moment to think! Ask again maybe?";
             }
            return "*confused meow* Mrrr? The magic chat box gave me something weird... Try asking again?";
        }

    } catch (error) {
        console.error("Failed to fetch from Gemini API:", error);
        // Provide more specific feedback for common network errors, use the name
        if (error instanceof TypeError) { // Often indicates network issue/CORS
             return `*Whimper...* ${currentUserName}... the connection is fuzzy... I can't reach the magic box! Check your internet? (Network Error)`;
         }
        return `*whimper* ${currentUserName}... something went wrong with the connection... I can't hear you properly! Maybe try again later? ;_;`;
    }
}
// --- END OF FILE api.js ---