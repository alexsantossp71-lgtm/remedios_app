
import { GoogleGenAI, Type } from "@google/genai";
import { Medication } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This will be caught by the App component and a fallback will be used.
  // In a real app, you might want more robust error handling or a dedicated error page.
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const getMedications = async (): Promise<Medication[]> => {
  if (!API_KEY) {
      throw new Error("API_KEY not configured.");
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Liste 50 dos medicamentos mais comuns e populares vendidos no Brasil. Forneça apenas os nomes comerciais ou genéricos.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medicamentos: {
              type: Type.ARRAY,
              description: "Uma lista de nomes de medicamentos.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "O nome do medicamento."
                  }
                },
                required: ['name']
              }
            }
          },
          required: ['medicamentos']
        },
      },
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    // The Gemini API may return { "medicamentos": [...] }, so we access that property
    if (parsed.medicamentos && Array.isArray(parsed.medicamentos)) {
        return parsed.medicamentos;
    }
    
    // Fallback if the structure is different
    if(Array.isArray(parsed)){
        return parsed;
    }

    throw new Error("Formato de resposta inesperado da API.");

  } catch (error) {
    console.error("Erro ao buscar medicamentos da API Gemini:", error);
    throw error;
  }
};
