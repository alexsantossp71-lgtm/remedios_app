import { useRef, type ChangeEvent } from 'react';
import type { ThemePreference, UserSettings } from '../types';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface SettingsModalProps {
  settings: UserSettings;
  notificationPermission: NotificationPermission | 'unsupported';
  canInstall: boolean;
  isInstalled: boolean;
  onClose: () => void;
  onSettingsChange: (settings: Partial<UserSettings>) => void;
  onRequestNotifications: () => void;
  onTestSound: () => void;
  onInstall: () => void;
  onExport: () => void;
  onImport: (json: string) => void;
  onClear: () => void;
}

const permissionLabel = (permission: NotificationPermission | 'unsupported'): string => {
  if (permission === 'granted') return 'Permitidas';
  if (permission === 'denied') return 'Bloqueadas pelo navegador';
  if (permission === 'unsupported') return 'Não disponíveis neste navegador';
  return 'Ainda não configuradas';
};

const THEMES: Array<{ value: ThemePreference; label: string; icon: 'smartphone' | 'target' | 'shield' }> = [
  { value: 'system', label: 'Sistema', icon: 'smartphone' },
  { value: 'light', label: 'Claro', icon: 'target' },
  { value: 'dark', label: 'Escuro', icon: 'shield' },
];

export const SettingsModal = ({
  settings,
  notificationPermission,
  canInstall,
  isInstalled,
  onClose,
  onSettingsChange,
  onRequestNotifications,
  onTestSound,
  onInstall,
  onExport,
  onImport,
  onClear,
}: SettingsModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onImport(reader.result);
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      title="Configurações"
      description="Personalize alertas, aparência e seus dados locais."
      onClose={onClose}
      size="large"
    >
      <div className="modal-body settings-layout">
        <section className="settings-section" aria-labelledby="alerts-settings-title">
          <div className="settings-section__title">
            <span><Icon name="bell" /></span>
            <div>
              <h3 id="alerts-settings-title">Alertas</h3>
              <p>Permita notificações e mantenha o som habilitado.</p>
            </div>
          </div>

          <div className="settings-box">
            <div className="settings-row">
              <div>
                <strong>Notificações do navegador</strong>
                <small>{permissionLabel(notificationPermission)}</small>
              </div>
              {notificationPermission !== 'granted' ? (
                <button
                  type="button"
                  className="button button--soft button--small"
                  onClick={onRequestNotifications}
                  disabled={notificationPermission === 'denied' || notificationPermission === 'unsupported'}
                >
                  Ativar
                </button>
              ) : (
                <input
                  className="switch"
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(event) => onSettingsChange({ notificationsEnabled: event.target.checked })}
                  aria-label="Usar notificações"
                />
              )}
            </div>
            <div className="settings-row">
              <div>
                <strong>Som do alerta</strong>
                <small>O primeiro teste libera o áudio neste dispositivo.</small>
              </div>
              <div className="settings-row__actions">
                <button type="button" className="text-button" onClick={onTestSound}>Testar</button>
                <input
                  className="switch"
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(event) => onSettingsChange({ soundEnabled: event.target.checked })}
                  aria-label="Usar som nos alertas"
                />
              </div>
            </div>
          </div>

          {notificationPermission === 'denied' && (
            <div className="inline-notice inline-notice--warning">
              <Icon name="info" size={18} />
              <p>As notificações foram bloqueadas. Abra as permissões deste site nas configurações do navegador para liberá-las.</p>
            </div>
          )}
        </section>

        <section className="settings-section" aria-labelledby="appearance-settings-title">
          <div className="settings-section__title">
            <span><Icon name="target" /></span>
            <div>
              <h3 id="appearance-settings-title">Aparência</h3>
              <p>Escolha como o aplicativo deve ser exibido.</p>
            </div>
          </div>
          <div className="theme-options">
            {THEMES.map((theme) => (
              <button
                type="button"
                className={settings.theme === theme.value ? 'is-selected' : ''}
                onClick={() => onSettingsChange({ theme: theme.value })}
                aria-pressed={settings.theme === theme.value}
                key={theme.value}
              >
                <Icon name={theme.icon} size={19} />
                {theme.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section" aria-labelledby="install-settings-title">
          <div className="settings-section__title">
            <span><Icon name="smartphone" /></span>
            <div>
              <h3 id="install-settings-title">Instalação</h3>
              <p>Use em tela cheia e encontre o app com mais facilidade.</p>
            </div>
          </div>
          <div className="settings-box settings-box--horizontal">
            <div>
              <strong>{isInstalled ? 'Aplicativo instalado' : 'Instalar neste dispositivo'}</strong>
              <small>
                {isInstalled
                  ? 'Você já está usando a versão instalada.'
                  : canInstall
                    ? 'Adicione o Remédio na Hora à tela inicial.'
                    : 'Use a opção “Adicionar à tela inicial” no menu do navegador.'}
              </small>
            </div>
            {canInstall && !isInstalled && (
              <button type="button" className="button button--primary button--small" onClick={onInstall}>
                <Icon name="download" size={17} /> Instalar
              </button>
            )}
          </div>
        </section>

        <section className="settings-section" aria-labelledby="data-settings-title">
          <div className="settings-section__title">
            <span><Icon name="shield" /></span>
            <div>
              <h3 id="data-settings-title">Seus dados</h3>
              <p>Os lembretes ficam somente neste navegador.</p>
            </div>
          </div>
          <div className="data-actions">
            <button type="button" className="button button--soft" onClick={onExport}>
              <Icon name="download" size={18} /> Exportar cópia
            </button>
            <button type="button" className="button button--soft" onClick={() => fileInputRef.current?.click()}>
              <Icon name="upload" size={18} /> Importar cópia
            </button>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              onChange={handleFile}
              tabIndex={-1}
            />
            <button type="button" className="button button--danger-outline" onClick={onClear}>
              <Icon name="trash" size={18} /> Apagar tudo
            </button>
          </div>
        </section>

        <div className="privacy-card">
          <Icon name="info" size={20} />
          <div>
            <strong>Importante</strong>
            <p>Este aplicativo apoia sua organização, mas não substitui receita ou orientação profissional. Alertas web podem atrasar quando o navegador ou o aparelho restringe atividades em segundo plano.</p>
          </div>
        </div>
      </div>
      <footer className="modal-footer">
        <span className="app-version">Remédio na Hora · versão 1.0</span>
        <button type="button" className="button button--primary" onClick={onClose}>Concluir</button>
      </footer>
    </Modal>
  );
};
