
import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeScreenshotColors(base64Image: string): Promise<{ backgroundColor: string, accentColor: string }> {
  // Use API key directly from process.env as per guidelines
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return { backgroundColor: "#f9fafb", accentColor: "#1d1d1f" };
  }

  try {
    // Initialize GoogleGenAI with the API key from process.env
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/png' } },
          { text: "Act as a senior UI/UX designer. Analyze this app screenshot. Suggest a background HEX color for a marketing frame that complements the screenshot's color palette (often a lighter or darker version of the app's primary brand color). Also, suggest a high-contrast HEX color for text that is accessible and stylish against that background. Return valid JSON only." }
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

    // Access the .text property directly (not a method)
    const text = response.text;
    if (!text) throw new Error("AI returned empty response");
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Analysis failed:", error);
    return { backgroundColor: "#f9fafb", accentColor: "#1d1d1f" };
  }
}
