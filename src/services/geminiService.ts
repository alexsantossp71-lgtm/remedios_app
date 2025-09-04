// Fix: Add reference to vite/client to provide types for import.meta.env
/// <reference types="vite/client" />

import { GoogleGenAI, Type } from "@google/genai";
import { Medication } from "../types";

// Vite expõe variáveis de ambiente no objeto `import.meta.env`
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  console.error("VITE_API_KEY environment variable not set.");
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
    
    if (parsed.medicamentos && Array.isArray(parsed.medicamentos)) {
        return parsed.medicamentos;
    }
    
    if(Array.isArray(parsed)){
        return parsed;
    }

    throw new Error("Formato de resposta inesperado da API.");

  } catch (error) {
    console.error("Erro ao buscar medicamentos da API Gemini:", error);
    throw error;
  }
};
