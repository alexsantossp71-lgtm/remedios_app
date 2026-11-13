
import React, { useRef, useState } from 'react';
import {
    applyBackup,
    describeSummary,
    decryptBackup,
    downloadEncryptedBackup,
    isEncryptedBackup,
    parseBackup,
} from '../services/backup';
import { flushSecureWrites } from '../services/secureStorage';
import { notificationStatus, NotificationSupport, requestNotificationPermission } from '../utils/notify';
import {
    FormModalShell,
    FormSection,
    helperClass,
} from './formFields';

interface Props {
    onClose: () => void;
    onLock: () => void;
}

const PERMISSION_LABELS: Record<NotificationSupport, string> = {
    granted: 'Ativadas — você será avisado mesmo com o app em segundo plano.',
    default: 'Não configuradas. Ative para receber o aviso da dose fora do app.',
    denied: 'Bloqueadas pelo navegador. Libere nas permissões do site para receber avisos.',
    unsupported: 'Este navegador não suporta notificações (no iPhone, instale o app na tela de início para habilitar).',
};

/** Configurações visíveis ao usuário: notificações e backup dos dados. */
const SettingsModal: React.FC<Props> = ({ onClose, onLock }) => {
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

        if (isEncryptedBackup(text)) {
            const password = window.prompt('Digite a senha usada para proteger este backup:');
            if (password === null) return;
            try {
                text = await decryptBackup(text, password);
            } catch (error) {
                setBackupMessage({ ok: false, text: error instanceof Error ? error.message : 'Não foi possível abrir o backup.' });
                return;
            }
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

        try {
            applyBackup(parsed.data);
            await flushSecureWrites();
            window.location.reload(); // recarrega com os dados importados
        } catch (error) {
            setBackupMessage({ ok: false, text: error instanceof Error ? error.message : 'Não foi possível concluir a restauração.' });
        }
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
                    Seus dados ficam salvos neste navegador. O arquivo de backup protegido é criptografado com uma senha escolhida por você. Guarde essa senha: não é possível recuperá-la se você esquecer.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        type="button"
                        onClick={async () => {
                            const password = window.prompt('Crie uma senha para proteger o backup (mínimo de 8 caracteres):');
                            if (password === null) return;
                            const confirmation = window.prompt('Digite novamente a senha do backup:');
                            if (confirmation === null) return;
                            if (password !== confirmation) {
                                setBackupMessage({ ok: false, text: 'As senhas não coincidem. O backup não foi gerado.' });
                                return;
                            }
                            try {
                                await downloadEncryptedBackup(password);
                                setBackupMessage({ ok: true, text: 'Backup protegido gerado. Guarde a senha em local seguro.' });
                            } catch (error) {
                                setBackupMessage({ ok: false, text: error instanceof Error ? error.message : 'Não foi possível gerar o backup.' });
                            }
                        }}
                        className="flex-1 px-4 py-2 rounded-md text-sm font-semibold border border-brand-blue text-brand-blue hover:bg-blue-50 dark:hover:bg-brand-gray-700 transition-colors"
                    >
                        Exportar backup protegido
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

            <FormSection title="Privacidade e segurança">
                <div className={helperClass}>
                    <p>Medicamentos, horários, histórico de doses, médicos, consultas, carteirinha, exames, fotos e laudos ficam criptografados neste dispositivo. O aplicativo não mantém uma conta nem sincroniza esses registros com um servidor próprio.</p>
                    <p className="mt-2">Quando você escolhe usar recursos de leitura ou análise inteligente, o conteúdo necessário para aquela função — que pode incluir texto, fotos ou dados de medicamentos — é enviado a um serviço externo para processamento. Não use esses recursos se não concordar com esse envio.</p>
                    <p className="mt-2">Os backups são arquivos baixados por você e protegidos por uma senha própria. Guarde a senha do aplicativo e a do backup em local seguro. Se perder a senha do aplicativo, não será possível recuperar o cofre sem um backup válido.</p>
                    <p className="mt-2">A proteção reduz o risco de leitura direta do armazenamento, mas não protege contra um dispositivo comprometido, extensões maliciosas ou acesso enquanto o aplicativo está desbloqueado. Bloqueie a tela ao se afastar.</p>
                    <p className="mt-2">A exclusão dos dados do navegador, a limpeza do perfil ou a perda do dispositivo pode apagar os registros locais. Exporte backups protegidos regularmente.</p>
                </div>
            </FormSection>
            <FormSection title="Bloqueio do aplicativo">
                <p className={helperClass}>Bloqueie a tela quando deixar o dispositivo. Será necessário digitar sua senha novamente para acessar os registros.</p>
                <button type="button" onClick={onLock} className="w-full rounded-lg border border-brand-blue px-4 py-2 font-semibold text-brand-blue hover:bg-blue-50 dark:hover:bg-brand-gray-700">
                    Bloquear aplicativo agora
                </button>
            </FormSection>
        </FormModalShell>
    );
};

export default SettingsModal;
