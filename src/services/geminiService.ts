// Fix: Add reference to vite/client to provide types for import.meta.env
/// <reference types="vite/client" />

import type { GoogleGenAI } from "@google/genai";
import { Medication } from "../types";

// Vite expõe variáveis de ambiente no objeto `import.meta.env`
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  console.warn("VITE_API_KEY não configurada — o autocomplete de medicamentos usará a lista offline.");
}

/** Indica se os recursos com IA (autocomplete, OCR da carteirinha) estão disponíveis. */
export const IS_API_CONFIGURED = Boolean(API_KEY);

// O SDK (~100 kB gzip) é carregado sob demanda, só quando a API é usada.
// O `import type` acima é apagado no build e não traz o SDK para o bundle.
let clientPromise: Promise<GoogleGenAI> | null = null;

function getClient(): Promise<GoogleGenAI> {
  if (!API_KEY) {
    return Promise.reject(new Error("API_KEY not configured."));
  }
  if (!clientPromise) {
    clientPromise = import("@google/genai").then(({ GoogleGenAI }) => new GoogleGenAI({ apiKey: API_KEY! }));
  }
  return clientPromise;
}

export const getMedications = async (): Promise<Medication[]> => {
  if (!API_KEY) {
      throw new Error("API_KEY not configured.");
  }

  try {
    // `Type` é um valor (enum) do SDK e precisa vir do import dinâmico também,
    // senão o bundler incluiria o SDK inteiro no chunk inicial.
    const { Type } = await import("@google/genai");
    const ai = await getClient();

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

    const jsonText = response.text ? response.text.trim() : '';
    if (!jsonText) {
        throw new Error("Resposta vazia da API Gemini.");
    }
    const parsed = JSON.parse(jsonText);

    if (parsed.medicamentos && Array.isArray(parsed.medicamentos)) {
        return parsed.medicamentos.filter((m: unknown) =>
            typeof m === 'object' && m !== null && typeof (m as Medication).name === 'string'
        );
    }

    if(Array.isArray(parsed)){
        return parsed.filter((m: unknown) =>
            typeof m === 'object' && m !== null && typeof (m as Medication).name === 'string'
        );
    }

    throw new Error("Formato de resposta inesperado da API.");

  } catch (error) {
    console.error("Erro ao buscar medicamentos da API Gemini:", error);
    throw error;
  }
};

// ===== OCR da carteirinha de plano de saúde (visão do Gemini) =====

export interface ScannedHealthCard {
  operator: string;
  planName: string;
  cardNumber: string; // somente dígitos
  holder: string;
  validity: string; // 'YYYY-MM-DD' ou ''
}

const SCAN_PROMPT = `Analise a foto de uma carteirinha de plano de saúde brasileira (ou cartão do SUS).
Extraia os campos do cadastro a partir da foto. Regras:
- Número da carteirinha: somente dígitos, sem espaços, pontos ou traços.
- Validade: formato AAAA-MM-DD; se não existir ou estiver ilegível, string vazia.
- Qualquer campo ilegível, ausente ou incompleto deve vir como string vazia.
- Não invente dados: se não estiver visível na foto, deixe vazio.`;

/** Envia a foto da carteirinha ao Gemini e devolve os campos reconhecidos. */
export const scanHealthCard = async (
  imageBase64: string,
  mimeType: string
): Promise<Partial<ScannedHealthCard>> => {
  if (!API_KEY) {
    throw new Error("API_KEY not configured.");
  }

  try {
    const { Type } = await import("@google/genai");
    const ai = await getClient();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: SCAN_PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            operator: { type: Type.STRING, description: "Operadora ou nome escrito na carteirinha (ex.: Unimed, Bradesco Saúde, SUS)." },
            planName: { type: Type.STRING, description: "Nome do plano contratado (ex.: Nacional Plus)." },
            cardNumber: { type: Type.STRING, description: "Número da carteirinha, somente dígitos." },
            holder: { type: Type.STRING, description: "Nome do titular impresso na carteirinha." },
            validity: { type: Type.STRING, description: "Validade em AAAA-MM-DD, ou string vazia." },
          },
        },
      },
    });

    const jsonText = response.text ? response.text.trim() : "";
    if (!jsonText) {
      throw new Error("Resposta vazia da API Gemini.");
    }
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;

    const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
    return {
      operator: str(parsed.operator),
      planName: str(parsed.planName),
      cardNumber: str(parsed.cardNumber).replace(/\D/g, ""),
      holder: str(parsed.holder),
      validity: /^\d{4}-\d{2}-\d{2}$/.test(str(parsed.validity)) ? str(parsed.validity) : "",
    };
  } catch (error) {
    console.error("Erro ao ler carteirinha com a API Gemini:", error);
    throw error;
  }
};
