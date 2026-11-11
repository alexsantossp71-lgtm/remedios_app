
import React, { useRef, useState } from 'react';
import { AiError, testConnection } from '../services/nvidiaService';
import {
    AiSettings,
    DEFAULT_TEXT_MODEL,
    DEFAULT_VISION_MODEL,
    readAiSettings,
    saveAiSettings,
} from '../services/settings';
import {
    applyBackup,
    describeSummary,
    downloadBackup,
    parseBackup,
} from '../services/backup';
import { notificationStatus, NotificationSupport, requestNotificationPermission } from '../utils/notify';
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

const PERMISSION_LABELS: Record<NotificationSupport, string> = {
    granted: 'Ativadas — você será avisado mesmo com o app em segundo plano.',
    default: 'Não configuradas. Ative para receber o aviso da dose fora do app.',
    denied: 'Bloqueadas pelo navegador. Libere nas permissões do site para receber avisos.',
    unsupported: 'Este navegador não suporta notificações (no iPhone, instale o app na tela de início para habilitar).',
};

/**
 * Configurações do app: chave da API NVIDIA (OCR e lista de medicamentos),
 * notificações do sistema e backup/exportação dos dados.
 * Tudo fica no localStorage local deste dispositivo.
 */
const SettingsModal: React.FC<Props> = ({ onClose }) => {
    const [apiKey, setApiKey] = useState(() => readAiSettings().nvidiaApiKey);
    const [visionModel, setVisionModel] = useState(() => readAiSettings().visionModel);
    const [textModel, setTextModel] = useState(() => readAiSettings().textModel);
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

    const [permission, setPermission] = useState<NotificationSupport>(() => notificationStatus());

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [backupMessage, setBackupMessage] = useState<{ ok: boolean; text: string } | null>(null);

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

    const handleActivateNotifications = async () => {
        const result = await requestNotificationPermission();
        setPermission(result);
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = ''; // permite reimportar o mesmo arquivo em sequência
        if (!file) return;
        setBackupMessage(null);

        let text: string;
        try {
            text = await file.text();
        } catch {
            setBackupMessage({ ok: false, text: 'Não foi possível ler o arquivo.' });
            return;
        }

        const parsed = parseBackup(text);
        if (!parsed.ok) {
            setBackupMessage({ ok: false, text: parsed.error });
            return;
        }

        const summaryText = describeSummary(parsed.summary);
        const confirmed = summaryText
            ? window.confirm(`Substituir os dados atuais por: ${summaryText}? Esta ação não pode ser desfeita.`)
            : window.confirm('Este backup está vazio. Todos os cadastros atuais serão apagados. Continuar?');
        if (!confirmed) return;

        applyBackup(parsed.data);
        window.location.reload(); // recarrega com os dados importados
    };

    return (
        <FormModalShell
            title="Configurações"
            onClose={onClose}
            onSubmit={handleSave}
            submitLabel="Salvar"
        >
            <FormSection title="API de IA (NVIDIA)">
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

            <FormSection title="Modelos de IA">
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

            <FormSection title="Notificações">
                <p className={`text-sm ${permission === 'granted' ? 'text-green-700 dark:text-green-400' : 'text-brand-gray-600 dark:text-brand-gray-300'}`}>
                    {PERMISSION_LABELS[permission]}
                </p>
                {permission === 'default' && (
                    <button
                        type="button"
                        onClick={handleActivateNotifications}
                        className="w-full px-4 py-2 rounded-md text-sm font-semibold border border-brand-blue text-brand-blue hover:bg-blue-50 dark:hover:bg-brand-gray-700 transition-colors"
                    >
                        Ativar notificações
                    </button>
                )}
                <p className={helperClass}>
                    As notificações avisam da dose quando o app está em segundo plano. Com o app aberto, o alarme sonoro toca normalmente.
                </p>
            </FormSection>

            <FormSection title="Backup dos dados">
                <p className={helperClass}>
                    Seus dados (lembretes, histórico de doses, médicos, consultas, planos e exames) ficam salvos apenas neste navegador.
                    Exporte um arquivo de vez em quando para não perder nada ao limpar o navegador ou trocar de aparelho.
                    <span className="font-semibold"> A chave da IA não é incluída.</span>
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        type="button"
                        onClick={() => {
                            downloadBackup();
                            setBackupMessage({ ok: true, text: 'Backup gerado. Verifique a pasta de downloads.' });
                        }}
                        className="flex-1 px-4 py-2 rounded-md text-sm font-semibold border border-brand-blue text-brand-blue hover:bg-blue-50 dark:hover:bg-brand-gray-700 transition-colors"
                    >
                        Exportar backup
                    </button>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 px-4 py-2 rounded-md text-sm font-semibold border border-brand-blue text-brand-blue hover:bg-blue-50 dark:hover:bg-brand-gray-700 transition-colors"
                    >
                        Importar backup
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={handleImportFile}
                        aria-label="Selecionar arquivo de backup"
                    />
                </div>
                {backupMessage && (
                    <p
                        role={backupMessage.ok ? 'status' : 'alert'}
                        className={`text-sm font-medium ${backupMessage.ok ? 'text-green-700 dark:text-green-400' : 'text-brand-red'}`}
                    >
                        {backupMessage.text}
                    </p>
                )}
            </FormSection>
        </FormModalShell>
    );
};

export default SettingsModal;
