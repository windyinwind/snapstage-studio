
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings } from "../types";

function cleanJson(text: string): string {
  // Remove markdown code blocks if present
  return text.replace(/```json\n?|```/g, '').trim();
}

export async function analyzeScreenshotColors(
  base64Image: string, 
  settings: AppSettings
): Promise<{ backgroundColor: string, accentColor: string }> {
  const { provider, modelName, apiBaseUrl, customApiKey } = settings;
  const apiKey = provider === 'custom' ? customApiKey : process.env.API_KEY;

  if (!apiKey) {
    return { backgroundColor: "#f9fafb", accentColor: "#1d1d1f" };
  }

  const prompt = "Act as a senior UI/UX designer. Analyze this app screenshot. Suggest a background HEX color for a marketing frame that complements the screenshot's color palette (often a lighter or darker version of the app's primary brand color). Also, suggest a high-contrast HEX color for text that is accessible and stylish against that background. Return valid JSON only with keys 'backgroundColor' and 'accentColor'.";

  try {
    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: 'image/png' } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              backgroundColor: { type: Type.STRING, description: "The HEX code for the canvas background." },
              accentColor: { type: Type.STRING, description: "The HEX code for the headline text." }
            },
            required: ["backgroundColor", "accentColor"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("AI returned empty response");
      return JSON.parse(cleanJson(text));
    } else {
      // Custom Provider (OpenAI Compatible)
      const response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      const content = data.choices[0].message.content;
      return JSON.parse(cleanJson(content));
    }
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return { backgroundColor: "#f9fafb", accentColor: "#1d1d1f" };
  }
}

export async function generateHeading(
  base64Image: string, 
  language: string, 
  appContext: string,
  settings: AppSettings
): Promise<string> {
  const { provider, modelName, apiBaseUrl, customApiKey } = settings;
  const apiKey = provider === 'custom' ? customApiKey : process.env.API_KEY;
  
  if (!apiKey) return "";

  const contextPrompt = appContext ? `\n\nContext about the app: ${appContext}` : "";
  const prompt = `Act as a professional App Store copywriter. 
1. Carefully analyze this screenshot to identify the specific page or feature being shown (e.g., Dashboard, Search, Settings, Onboarding, Checkout, etc.).
2. Write a short, punchy, and high-converting marketing headline (max 5-7 words) that highlights the unique value proposition of THIS specific screen.
3. Avoid generic headlines that could apply to any screen. Make it highly relevant to the visual elements present.

The headline must be in ${language === 'zh' ? 'Simplified Chinese' : language === 'ja' ? 'Japanese' : language === 'ko' ? 'Korean' : 'English'}.${contextPrompt}

Return ONLY the headline text, no quotes, no labels, and no extra explanation.`;

  try {
    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: 'image/png' } },
            { text: prompt }
          ]
        }
      });
      return response.text?.trim() || "";
    } else {
      // Custom Provider (OpenAI Compatible)
      const response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim();
    }
  } catch (error) {
    console.error("AI Heading Generation failed:", error);
    return "";
  }
}
