
import React, { useRef, useState } from 'react';
import {
    applyBackup,
    describeSummary,
    decryptBackup,
    downloadBackup,
    downloadEncryptedBackup,
    isEncryptedBackup,
    parseBackup,
} from '../services/backup';
import { createSecureVault, disableSecureVault, flushSecureWrites, inspectSecureStorage } from '../services/secureStorage';
import { notificationStatus, NotificationSupport, requestNotificationPermission } from '../utils/notify';
import type { Reminder } from '../types';
import { disablePush, enablePush, isPushEnabled } from '../services/pushNotifications';
import AiDiagnosticsModal from './AiDiagnosticsModal';
import {
    FormModalShell,
    FormSection,
    helperClass,
} from './formFields';

interface Props {
    onClose: () => void;
    onLock: () => void;
    reminders: Reminder[];
}

const PERMISSION_LABELS: Record<NotificationSupport, string> = {
    granted: 'Permissão do navegador concedida. Para receber avisos com o navegador fechado, ative o Push abaixo.',
    default: 'Não configuradas. Ative para receber o aviso da dose fora do app.',
    denied: 'Bloqueadas pelo navegador. Libere nas permissões do site para receber avisos.',
    unsupported: 'Este navegador não suporta notificações (no iPhone, instale o app na tela de início para habilitar).',
};

/** Configurações visíveis ao usuário: notificações e backup dos dados. */
const SettingsModal: React.FC<Props> = ({ onClose, onLock, reminders }) => {
    const [permission, setPermission] = useState<NotificationSupport>(() => notificationStatus());
    const [isProtected, setIsProtected] = useState(false);
    const [passwordBusy, setPasswordBusy] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(() => isPushEnabled());
    const [pushBusy, setPushBusy] = useState(false);
    const [pushMessage, setPushMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [aiDiagnosticsOpen, setAiDiagnosticsOpen] = useState(false);

    React.useEffect(() => { inspectSecureStorage().then(status => setIsProtected(status.configured)).catch(() => setIsProtected(false)); }, []);

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
                    Os alarmes locais dependem de o navegador manter o aplicativo em execução. Para tentar receber avisos com o navegador fechado, ative o Push abaixo.
                </p>
            </FormSection>

            <FormSection title="Avisos Push — mesmo com o app fechado">
                <p className={helperClass}>
                    Opcional. Ao ativar, este dispositivo compartilha com o servidor somente o endereço técnico de notificações e os horários futuros em UTC. Nomes de medicamentos, doses, diagnósticos e histórico permanecem neste aparelho. O aviso recebido será genérico.
                </p>
                <p className={helperClass}>
                    A entrega depende do navegador, da conexão e do sistema operacional; não substitui o alarme local nem garante aviso em todas as situações.
                </p>
                {!pushEnabled ? (
                    <button
                        type="button"
                        disabled={pushBusy}
                        onClick={async () => {
                            setPushBusy(true);
                            setPushMessage(null);
                            try {
                                await enablePush(reminders);
                                setPushEnabled(true);
                                setPushMessage({ ok: true, text: 'Notificações Push ativadas neste dispositivo.' });
                            } catch (error) {
                                setPushEnabled(isPushEnabled());
                                setPushMessage({ ok: false, text: error instanceof Error ? error.message : 'Não foi possível ativar as notificações Push.' });
                            } finally {
                                setPushBusy(false);
                            }
                        }}
                        className="w-full px-4 py-2 rounded-md text-sm font-semibold bg-brand-blue text-white disabled:opacity-50"
                    >
                        {pushBusy ? 'Ativando…' : 'Ativar avisos Push neste dispositivo'}
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled={pushBusy}
                        onClick={async () => {
                            setPushBusy(true);
                            setPushMessage(null);
                            try {
                                await disablePush();
                                setPushEnabled(false);
                                setPushMessage({ ok: true, text: 'Avisos Push desativados neste dispositivo.' });
                            } catch (error) {
                                setPushMessage({ ok: false, text: error instanceof Error ? error.message : 'Não foi possível desativar os avisos Push.' });
                            } finally {
                                setPushBusy(false);
                            }
                        }}
                        className="w-full px-4 py-2 rounded-md text-sm font-semibold border border-brand-gray-400 text-brand-gray-700 dark:text-brand-gray-200 disabled:opacity-50"
                    >
                        {pushBusy ? 'Aguarde…' : 'Desativar avisos Push'}
                    </button>
                )}
                {pushMessage && (
                    <p role={pushMessage.ok ? 'status' : 'alert'} className={pushMessage.ok ? 'text-sm text-green-700 dark:text-green-400' : 'text-sm text-brand-red'}>
                        {pushMessage.text}
                    </p>
                )}
            </FormSection>

            <FormSection title="Backup dos dados">
                <p className={helperClass}>
                    Seus dados ficam salvos neste navegador e você pode usar o aplicativo sem senha. Ao ativar a proteção, os registros locais passam a ser criptografados. No backup, você pode escolher entre um arquivo comum (sem senha) ou protegido por senha.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => { try { downloadBackup(); setBackupMessage({ ok: true, text: 'Backup sem criptografia gerado. Como o arquivo contém dados pessoais, guarde-o em local privado.' }); } catch (error) { setBackupMessage({ ok: false, text: error instanceof Error ? error.message : 'Não foi possível gerar o backup.' }); } }} className="flex-1 px-4 py-2 rounded-md text-sm font-semibold border border-brand-gray-400 text-brand-gray-700 dark:text-brand-gray-200 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">Exportar sem senha</button>
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

            <FormSection title="Diagnóstico da inteligência artificial">\n                <p className={helperClass}>Compare os modelos disponíveis no serviço NVIDIA. O teste usa somente exemplos fictícios e não envia os medicamentos ou horários cadastrados neste aparelho.</p>\n                <button type="button" onClick={() => setAiDiagnosticsOpen(true)} className="w-full rounded-lg border border-brand-blue px-4 py-2.5 text-sm font-semibold text-brand-blue hover:bg-blue-50 dark:hover:bg-brand-gray-700">Testar velocidade e qualidade dos modelos</button>\n            </FormSection>\n            {aiDiagnosticsOpen && <AiDiagnosticsModal onClose={() => setAiDiagnosticsOpen(false)} />}\n\n            <FormSection title="Privacidade e segurança">
                <div className={helperClass}>
                    <p>Medicamentos, horários, histórico de doses, médicos, consultas, carteirinha, exames, fotos e laudos ficam armazenados neste dispositivo. Se você ativar a senha, esses registros serão criptografados. O aplicativo não mantém uma conta nem sincroniza esses registros com um servidor próprio.</p>
                    <p className="mt-2">Quando você escolhe usar recursos de leitura ou análise inteligente, o conteúdo necessário para aquela função — que pode incluir texto, fotos ou dados de medicamentos — é enviado a um serviço externo para processamento. Não use esses recursos se não concordar com esse envio.</p>
                    <p className="mt-2">O backup pode ser exportado sem criptografia ou protegido por uma senha própria. Arquivos sem criptografia podem ser lidos por qualquer pessoa que tenha acesso a eles. Se ativar a senha do aplicativo, guarde-a: não há recuperação automática.</p>
                    <p className="mt-2">A proteção reduz o risco de leitura direta do armazenamento, mas não protege contra um dispositivo comprometido, extensões maliciosas ou acesso enquanto o aplicativo está desbloqueado. Bloqueie a tela ao se afastar.</p>
                    <p className="mt-2">A exclusão dos dados do navegador, a limpeza do perfil ou a perda do dispositivo pode apagar os registros locais. Faça backups regularmente e, se possível, proteja o arquivo com senha.</p>
                </div>
            </FormSection>
            <FormSection title="Senha e bloqueio">
                {!isProtected ? <>
                    <p className={helperClass}>A senha é opcional. Você pode continuar usando o aplicativo sem bloqueio ou ativar a criptografia local quando desejar.</p>
                    <button type="button" disabled={passwordBusy} onClick={async () => { const password = window.prompt('Crie uma senha com pelo menos 10 caracteres para proteger os dados deste dispositivo:'); if (password === null) return; const confirmation = window.prompt('Digite novamente a senha:'); if (confirmation === null) return; if (password !== confirmation) { setBackupMessage({ ok: false, text: 'As senhas não coincidem.' }); return; } setPasswordBusy(true); try { await createSecureVault(password); setIsProtected(true); setBackupMessage({ ok: true, text: 'Proteção ativada. Seus dados foram criptografados neste dispositivo.' }); window.location.reload(); } catch (error) { setBackupMessage({ ok: false, text: error instanceof Error ? error.message : 'Não foi possível ativar a proteção.' }); } finally { setPasswordBusy(false); } }} className="w-full rounded-lg bg-brand-blue px-4 py-2 font-semibold text-white disabled:opacity-60">{passwordBusy ? 'Ativando proteção…' : 'Quero cadastrar uma senha'}</button>
                </> : <>
                    <p className={helperClass}>A proteção por senha está ativa. Será necessário desbloquear o aplicativo ao abrir novamente.</p>
                    <button type="button" onClick={onLock} className="w-full rounded-lg border border-brand-blue px-4 py-2 font-semibold text-brand-blue hover:bg-blue-50 dark:hover:bg-brand-gray-700">Bloquear aplicativo agora</button>
                    <button type="button" onClick={async () => { const confirmed = window.confirm('Desativar a senha? Seus dados continuarão neste dispositivo, mas deixarão de ser criptografados.'); if (!confirmed) return; try { await disableSecureVault(); window.location.reload(); } catch (error) { setBackupMessage({ ok: false, text: error instanceof Error ? error.message : 'Não foi possível desativar a proteção.' }); } }} className="w-full rounded-lg border border-brand-gray-400 px-4 py-2 text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-200 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">Desativar senha e manter acesso livre</button>
                </>}
            </FormSection>
        </FormModalShell>
    );
};

export default SettingsModal;
