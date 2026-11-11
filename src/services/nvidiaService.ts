
import { Medication, EXAM_CATEGORIES } from '../types';
import { readAiSettings } from './settings';

// ===== Cliente da API NVIDIA (build.nvidia.com) =====
// A API da NVIDIA segue o formato OpenAI: POST {base}/chat/completions com
// cabeçalho Bearer. Modelos de visão recebem a imagem como data URL base64
// dentro de `image_url` (docs: NIM for Vision Language Models).

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const REQUEST_TIMEOUT_MS = 60_000;

/** Erro já com mensagem amigável para exibir direto na interface. */
export class AiError extends Error {}

/**
 * Endpoint base da API. Pode ser sobrescrito gravando "nvidiaBaseUrl" no
 * localStorage (recurso de teste/debug; usuários normais nunca setam isso).
 */
function baseUrl(): string {
    try {
        const override = localStorage.getItem('nvidiaBaseUrl')?.trim();
        if (override) return override.replace(/\/+$/, '');
    } catch {
        // localStorage indisponível: segue com o endpoint oficial
    }
    return DEFAULT_BASE_URL;
}

interface ChatContentPart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
}

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | ChatContentPart[];
}

interface ChatChoice {
    message?: { content?: unknown };
}

/** Chamada única de chat completions; devolve o texto da primeira resposta. */
async function chatCompletion(
    messages: ChatMessage[],
    model: string,
    options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
    const apiKey = readAiSettings().nvidiaApiKey.trim();
    if (!apiKey) {
        throw new AiError('Configure a chave da API NVIDIA nas Configurações (ícone IA no topo) para usar os recursos de IA.');
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(`${baseUrl()}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: options?.temperature ?? 0.2,
                max_tokens: options?.maxTokens ?? 1024,
                stream: false,
            }),
            signal: controller.signal,
        });
    } catch {
        throw new AiError('Não foi possível conectar à API da NVIDIA. Verifique sua conexão com a internet.');
    } finally {
        window.clearTimeout(timeout);
    }

    if (!response.ok) {
        throw new AiError(await describeHttpError(response));
    }

    const data = (await response.json().catch(() => null)) as { choices?: ChatChoice[] } | null;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) return content;
    if (Array.isArray(content)) {
        const text = content
            .map((part) => (typeof part === 'string' ? part : typeof (part as ChatContentPart)?.text === 'string' ? (part as ChatContentPart).text! : ''))
            .join('');
        if (text.trim()) return text;
    }
    throw new AiError('A API da NVIDIA respondeu em um formato inesperado. Tente novamente.');
}

/** Traduz erros HTTP da API para mensagens claras em português. */
async function describeHttpError(response: Response): Promise<string> {
    let detail = '';
    try {
        const body = await response.json();
        if (typeof body?.detail === 'string') detail = body.detail;
        else if (typeof body?.error?.message === 'string') detail = body.error.message;
    } catch {
        // corpo sem JSON: segue sem detalhe
    }
    if (response.status === 401 || response.status === 403) {
        return 'Chave da API NVIDIA inválida ou sem permissão. Gere uma chave nova em build.nvidia.com ("Get API Key") e confirme nas Configurações.';
    }
    if (response.status === 404) {
        return `Modelo não disponível para sua conta. Verifique o nome do modelo nas Configurações. ${detail}`.trim();
    }
    if (response.status === 429) {
        return 'Limite de uso da API NVIDIA atingido. Aguarde alguns instantes e tente novamente.';
    }
    return `A API da NVIDIA respondeu com erro ${response.status}. ${detail}`.trim();
}

/** Extrai o primeiro objeto JSON da resposta do modelo (tolerante a blocos de código). */
function extractJson(text: string): Record<string, unknown> {
    const cleaned = text.replace(/```(?:json)?/gi, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) {
        throw new AiError('A IA não devolveu os dados no formato esperado. Tente novamente.');
    }
    try {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
        throw new AiError('A IA não devolveu os dados no formato esperado. Tente novamente.');
    }
}

// ===== OCR da carteirinha de plano de saúde (modelo de visão) =====

export interface ScannedHealthCard {
    operator: string;
    planName: string;
    cardNumber: string; // somente dígitos
    holder: string;
    validity: string; // 'YYYY-MM-DD' ou ''
    phone: string; // somente dígitos ou ''
    coverage: string;
}

const SCAN_PROMPT = `Analise a foto de uma carteirinha de plano de saúde brasileira (ou cartão do SUS) e extraia os campos do cadastro.

Responda APENAS com um JSON válido, sem nenhum texto antes ou depois, neste formato:
{"operator":"...","planName":"...","cardNumber":"...","holder":"...","validity":"...","phone":"...","coverage":"..."}

Regras:
- operator: operadora ou nome impresso na carteirinha (ex.: Unimed, Bradesco Saúde, SUS).
- planName: nome do plano ou do cartão (ex.: Nacional Plus, Cartão Nacional de Saúde).
- cardNumber: número da carteirinha, somente dígitos, sem espaços, pontos ou traços.
- holder: nome do titular impresso na carteirinha.
- validity: data de validade visível (procure por "Válida até", "Validade") em AAAA-MM-DD; string vazia se não houver.
- phone: telefone/SAC da operadora impresso na carteirinha, somente dígitos; string vazia se não houver.
- coverage: se houver texto visível sobre cobertura, rede credenciada ou abrangência, resuma em uma frase; senão string vazia.
- Qualquer campo ilegível, ausente ou incompleto deve ser string vazia. Não invente dados.
- Se a imagem não for uma carteirinha de plano de saúde, responda apenas {"error":"not_a_card"}.`;

/** Envia a foto da carteirinha ao modelo de visão da NVIDIA e devolve os campos reconhecidos. */
export const scanHealthCard = async (
    imageBase64: string,
    mimeType: string
): Promise<Partial<ScannedHealthCard>> => {
    const { visionModel } = readAiSettings();
    const content = await chatCompletion(
        [
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
                    { type: 'text', text: SCAN_PROMPT },
                ],
            },
        ],
        visionModel,
        { maxTokens: 800, temperature: 0.1 }
    );

    const parsed = extractJson(content);
    if (parsed.error === 'not_a_card') {
        throw new AiError('A foto não parece ser uma carteirinha de plano de saúde. Tente outra imagem com melhor luz e enquadramento.');
    }

    const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
    return {
        operator: str(parsed.operator),
        planName: str(parsed.planName),
        cardNumber: str(parsed.cardNumber).replace(/\D/g, ''),
        holder: str(parsed.holder),
        validity: /^\d{4}-\d{2}-\d{2}$/.test(str(parsed.validity)) ? str(parsed.validity) : '',
        phone: str(parsed.phone).replace(/\D/g, ''),
        coverage: str(parsed.coverage),
    };
};

// ===== OCR do pedido de exame (modelo de visão) =====

export interface ScannedExamRequest {
    name: string; // nome(s) do(s) exame(s), separados por vírgula
    category: string; // uma das EXAM_CATEGORIES ou ''
    doctorName: string;
    place: string;
    date: string; // 'YYYY-MM-DD' ou ''
}

const EXAM_SCAN_PROMPT = `Analise a foto de um pedido médico de exames do Brasil e extraia os dados para o cadastro.

Responda APENAS com um JSON válido, sem nenhum texto antes ou depois, neste formato:
{"name":"...","category":"...","doctorName":"...","place":"...","date":"..."}

Regras:
- name: nome do exame pedido (se houver vários, separe por vírgula). Ex.: "Hemograma completo, Glicemia em jejum".
- category: classifique o(s) exame(s) em exatamente uma destas opções: "Laboratório" (sangue, urina, fezes), "Imagem" (raio-x, ultrassom, tomografia, ressonância, mamografia), "Cardiológico" (ECG, ecocardiograma, teste ergométrico), "Oftalmológico" ou "Outro". Use string vazia se não for possível classificar.
- doctorName: nome do médico solicitante impresso no pedido (mantenha "Dr."/"Dra." se constar).
- place: nome do laboratório ou clínica indicado no pedido, se houver; senão string vazia.
- date: data do pedido visível no documento, em AAAA-MM-DD; string vazia se não houver.
- Qualquer campo ilegível, ausente ou incompleto deve ser string vazia. Não invente dados.
- Se a imagem não for um pedido de exame, responda apenas {"error":"not_a_request"}.`;

/** Envia a foto do pedido de exame ao modelo de visão da NVIDIA e devolve os campos reconhecidos. */
export const scanExamRequest = async (
    imageBase64: string,
    mimeType: string
): Promise<Partial<ScannedExamRequest>> => {
    const { visionModel } = readAiSettings();
    const content = await chatCompletion(
        [
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
                    { type: 'text', text: EXAM_SCAN_PROMPT },
                ],
            },
        ],
        visionModel,
        { maxTokens: 500, temperature: 0.1 }
    );

    const parsed = extractJson(content);
    if (parsed.error === 'not_a_request') {
        throw new AiError('A foto não parece ser um pedido de exame. Tente outra imagem com melhor luz e enquadramento.');
    }

    const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
    const category = str(parsed.category);
    return {
        name: str(parsed.name),
        category: (EXAM_CATEGORIES as readonly string[]).includes(category) ? category : '',
        doctorName: str(parsed.doctorName),
        place: str(parsed.place),
        date: /^\d{4}-\d{2}-\d{2}$/.test(str(parsed.date)) ? str(parsed.date) : '',
    };
};

// ===== Lista online de medicamentos (modelo de texto) =====

/** Busca a lista de medicamentos comuns; usada no autocomplete do lembrete. */
export const getMedications = async (): Promise<Medication[]> => {
    const { textModel } = readAiSettings();
    const content = await chatCompletion(
        [
            {
                role: 'user',
                content:
                    'Liste 50 dos medicamentos mais comuns e populares vendidos no Brasil, apenas nomes comerciais ou genéricos. Responda APENAS com um JSON válido no formato {"medicamentos":[{"name":"nome"}]}.',
            },
        ],
        textModel,
        { maxTokens: 2000, temperature: 0.3 }
    );

    const parsed = extractJson(content);
    const list: unknown[] = Array.isArray(parsed.medicamentos)
        ? (parsed.medicamentos as unknown[])
        : Array.isArray(parsed)
            ? (parsed as unknown[])
            : [];
    return list.filter(
        (item): item is Medication =>
            typeof item === 'object' && item !== null &&
            typeof (item as Medication).name === 'string' &&
            (item as Medication).name.trim().length > 0
    );
};

// ===== Teste de conexão (tela de Configurações) =====

/** Consulta a lista de modelos da conta e devolve um resumo do status. */
export const testConnection = async (): Promise<string> => {
    const { nvidiaApiKey, visionModel, textModel } = readAiSettings();
    const apiKey = nvidiaApiKey.trim();
    if (!apiKey) throw new AiError('Informe a chave da API antes de testar.');

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    let response: Response;
    try {
        response = await fetch(`${baseUrl()}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
        });
    } catch {
        throw new AiError('Não foi possível conectar à API da NVIDIA. Verifique sua conexão com a internet.');
    } finally {
        window.clearTimeout(timeout);
    }
    if (!response.ok) throw new AiError(await describeHttpError(response));

    const data = (await response.json().catch(() => null)) as { data?: Array<{ id?: unknown }> } | null;
    const ids = Array.isArray(data?.data)
        ? data!.data!.map((m) => (typeof m?.id === 'string' ? m.id : '')).filter(Boolean)
        : [];

    const warnings: string[] = [];
    if (ids.length && !ids.includes(visionModel)) warnings.push(`o modelo de visão "${visionModel}" não consta na sua conta`);
    if (ids.length && !ids.includes(textModel)) warnings.push(`o modelo de texto "${textModel}" não consta na sua conta`);

    if (warnings.length) return `Conectado à NVIDIA. Atenção: ${warnings.join(' e ')}.`;
    return ids.length
        ? `Conectado à NVIDIA! ${ids.length} modelos disponíveis para sua chave.`
        : 'Conectado à NVIDIA!';
};
