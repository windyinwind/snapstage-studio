
import { GoogleGenAI, Type } from "@google/genai";

// Use process.env.API_KEY directly for initialization as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeScreenshotColors(base64Image: string): Promise<{ backgroundColor: string, accentColor: string }> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      // Use the recommended parts object for multimodal contents
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

    // Extract text output from the response.text property (not a method)
    const text = response.text;
    if (!text) throw new Error("AI returned empty response");
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Analysis failed:", error);
    return { backgroundColor: "#ffffff", accentColor: "#007AFF" };
  }
}
