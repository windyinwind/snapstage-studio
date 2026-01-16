
import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeScreenshotColors(base64Image: string): Promise<{ backgroundColor: string, accentColor: string }> {
  // Check if API Key is configured safely (handling browser environments where process might be undefined)
  const apiKey = (typeof process !== "undefined" && process.env) ? process.env.API_KEY : undefined;

  // If no API key is present, return defaults immediately without initializing the SDK
  if (!apiKey) {
    return { backgroundColor: "#ffffff", accentColor: "#007AFF" };
  }

  try {
    // Initialize SDK only when key is present and needed
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/png' } },
          { text: "Analyze this app screenshot and suggest the most appropriate background color and accent color in HEX format to use for framing this screenshot in an App Store preview. Return only the JSON object." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            backgroundColor: { type: Type.STRING },
            accentColor: { type: Type.STRING }
          },
          required: ["backgroundColor", "accentColor"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI returned empty response");
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Analysis failed:", error);
    // Fallback to defaults on any error
    return { backgroundColor: "#ffffff", accentColor: "#007AFF" };
  }
}
