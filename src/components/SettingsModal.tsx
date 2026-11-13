
import React, { useRef, useState } from 'react';
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

/** Configurações visíveis ao usuário: notificações e backup dos dados. */
const SettingsModal: React.FC<Props> = ({ onClose }) => {
    const [permission, setPermission] = useState<NotificationSupport>(() => notificationStatus());

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [backupMessage, setBackupMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const handleSave = () => onClose();

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
            ? window.confirm(`Substituir as categorias presentes no backup por: ${summaryText}? Categorias ausentes no arquivo serão preservadas. Esta ação não pode ser desfeita.`)
            : window.confirm('Este backup não contém categorias de dados reconhecidas. Nenhum dado será alterado. Continuar?');
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
            {/* Configurações da IA são internas e não aparecem para o usuário. */}

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
                    Seus dados (lembretes, histórico de doses, médicos, consultas, planos, exames e laudos laboratoriais) ficam salvos apenas neste navegador.
                    Exporte um arquivo de vez em quando para não perder nada ao limpar o navegador ou trocar de aparelho.
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
