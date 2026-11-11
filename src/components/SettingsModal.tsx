
import React, { useState } from 'react';
import { AiError, testConnection } from '../services/nvidiaService';
import {
    AiSettings,
    DEFAULT_TEXT_MODEL,
    DEFAULT_VISION_MODEL,
    readAiSettings,
    saveAiSettings,
} from '../services/settings';
import {
    FormModalShell,
    FormSection,
    helperClass,
    inputClass,
    labelClass,
} from './formFields';

interface Props {
    onClose: () => void;
}

/**
 * Configurações de IA: chave da API NVIDIA e modelos usados no OCR da
 * carteirinha e na lista de medicamentos. Tudo fica no localStorage local.
 */
const SettingsModal: React.FC<Props> = ({ onClose }) => {
    const [apiKey, setApiKey] = useState(() => readAiSettings().nvidiaApiKey);
    const [visionModel, setVisionModel] = useState(() => readAiSettings().visionModel);
    const [textModel, setTextModel] = useState(() => readAiSettings().textModel);
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

    const current = (): AiSettings => ({ nvidiaApiKey: apiKey, visionModel, textModel });

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        saveAiSettings(current()); // salva antes para o serviço ler os valores novos
        try {
            const message = await testConnection();
            setTestResult({ ok: true, message });
        } catch (error) {
            setTestResult({
                ok: false,
                message: error instanceof AiError ? error.message : 'Falha ao testar a conexão.',
            });
        } finally {
            setTesting(false);
        }
    };

    const handleSave = () => {
        saveAiSettings(current());
        onClose();
    };

    return (
        <FormModalShell
            title="Configurações de IA (NVIDIA)"
            onClose={onClose}
            onSubmit={handleSave}
            submitLabel="Salvar"
        >
            <FormSection title="API">
                <div>
                    <label htmlFor="settings-api-key" className={labelClass}>Chave da API NVIDIA</label>
                    <div className="flex gap-2 items-start mt-1">
                        <input
                            id="settings-api-key"
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                            className={inputClass()}
                            placeholder="nvapi-..."
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey((v) => !v)}
                            className="px-3 py-2 rounded-md text-xs font-semibold bg-brand-gray-200 dark:bg-brand-gray-600 hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500 transition-colors"
                        >
                            {showKey ? 'Ocultar' : 'Mostrar'}
                        </button>
                    </div>
                    <p className={helperClass}>
                        Gere sua chave em <span className="font-semibold">build.nvidia.com</span> (botão "Get API Key", começa com <code>nvapi-</code>).
                        Ela fica salva <span className="font-semibold">apenas neste dispositivo</span> e é enviada somente para a API da NVIDIA.
                        Deixe vazia para desativar os recursos de IA.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !apiKey.trim()}
                    className="w-full px-4 py-2 rounded-md text-sm font-semibold border border-brand-blue text-brand-blue hover:bg-blue-50 dark:hover:bg-brand-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {testing ? 'Testando conexão...' : 'Testar conexão'}
                </button>
                {testResult && (
                    <p
                        role={testResult.ok ? 'status' : 'alert'}
                        className={`text-sm font-medium ${testResult.ok ? 'text-green-700 dark:text-green-400' : 'text-brand-red'}`}
                    >
                        {testResult.message}
                    </p>
                )}
            </FormSection>

            <FormSection title="Modelos">
                <div>
                    <label htmlFor="settings-vision-model" className={labelClass}>Modelo de visão (OCR: carteirinha e pedido de exame)</label>
                    <input
                        id="settings-vision-model"
                        type="text"
                        list="vision-model-options"
                        value={visionModel}
                        onChange={(e) => setVisionModel(e.target.value)}
                        className={inputClass()}
                        spellCheck={false}
                    />
                    <datalist id="vision-model-options">
                        <option value={DEFAULT_VISION_MODEL} />
                        <option value="meta/llama-3.2-11b-vision-instruct" />
                    </datalist>
                    <p className={helperClass}>
                        Precisa ser um modelo com leitura de imagens. Padrão: {DEFAULT_VISION_MODEL}.
                    </p>
                </div>
                <div>
                    <label htmlFor="settings-text-model" className={labelClass}>Modelo de texto (lista de medicamentos)</label>
                    <input
                        id="settings-text-model"
                        type="text"
                        list="text-model-options"
                        value={textModel}
                        onChange={(e) => setTextModel(e.target.value)}
                        className={inputClass()}
                        spellCheck={false}
                    />
                    <datalist id="text-model-options">
                        <option value={DEFAULT_TEXT_MODEL} />
                    </datalist>
                    <p className={helperClass}>
                        Gera a lista online de medicamentos no cadastro de lembretes. Padrão: {DEFAULT_TEXT_MODEL}.
                    </p>
                </div>
            </FormSection>
        </FormModalShell>
    );
};

export default SettingsModal;
