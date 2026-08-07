import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReminderStatus,
  type AppData,
  type BeforeInstallPromptEvent,
  type DoseOccurrence,
  type Reminder,
  type ReminderInput,
  type UserSettings,
} from './types';
import { AddReminderModal } from './components/AddReminderModal';
import { Calendar } from './components/Calendar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DoseList } from './components/DoseList';
import { Icon } from './components/Icon';
import { NotificationModal } from './components/NotificationModal';
import { ReminderList } from './components/ReminderList';
import { SettingsModal } from './components/SettingsModal';
import { useAlarmEngine } from './hooks/useAlarmEngine';
import {
  getNotificationPermission,
  playAlarmSound,
  requestNotificationPermission,
} from './services/notifications';
import {
  addCalendarDays,
  endOfLocalDay,
  formatDateTime,
  formatLongDate,
  getGreeting,
  parseLocalDate,
  startOfLocalDay,
  todayKey,
} from './utils/date';
import {
  getAdherenceSummary,
  getDosesForDate,
  getNextDose,
  makeOccurrence,
} from './utils/schedule';
import {
  createEmptyAppData,
  exportAppData,
  importAppData,
  loadAppData,
  saveAppData,
} from './utils/storage';

interface ToastMessage {
  id: number;
  message: string;
  tone: 'success' | 'warning' | 'neutral';
}

type EditorState = Reminder | 'new' | null;

const createId = (): string =>
  'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const formatNextDose = (occurrence: DoseOccurrence | null, now: Date): string => {
  if (!occurrence) return 'Nenhuma dose futura';
  const occurrenceDay = startOfLocalDay(occurrence.scheduledAt);
  const currentDay = startOfLocalDay(now);
  const tomorrow = addCalendarDays(currentDay, 1);
  if (occurrenceDay.getTime() === currentDay.getTime()) return `Hoje às ${occurrence.time}`;
  if (occurrenceDay.getTime() === tomorrow.getTime()) return `Amanhã às ${occurrence.time}`;
  return formatDateTime(occurrence.scheduledAt);
};

const App = () => {
  const [data, setData] = useState<AppData>(loadAppData);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [now, setNow] = useState(() => new Date());
  const [editor, setEditor] = useState<EditorState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [alertQueue, setAlertQueue] = useState<DoseOccurrence[]>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  );

  useEffect(() => saveAppData(data), [data]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleInstallPrompt = (event: Event): void => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = (): void => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastMessage['tone'] = 'success'): void => {
      setToast({ id: Date.now(), message, tone });
    },
    [],
  );

  const handleDue = useCallback((occurrence: DoseOccurrence): void => {
    setAlertQueue((current) =>
      current.some((item) => item.alertKey === occurrence.alertKey)
        ? current
        : [...current, occurrence],
    );
  }, []);

  const handleAlerted = useCallback((alertKeys: string[]): void => {
    const timestamp = new Date().toISOString();
    setData((current) => ({
      ...current,
      alertedDoseKeys: alertKeys.reduce(
        (result, key) => ({ ...result, [key]: timestamp }),
        current.alertedDoseKeys,
      ),
    }));
  }, []);

  useAlarmEngine({
    reminders: data.reminders,
    snoozes: data.snoozes,
    alertedDoseKeys: data.alertedDoseKeys,
    notificationsEnabled: data.settings.notificationsEnabled,
    soundEnabled: data.settings.soundEnabled,
    onDue: handleDue,
    onAlerted: handleAlerted,
  });

  const closeEditor = useCallback(() => setEditor(null), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeDeleteConfirmation = useCallback(() => setDeleteTarget(null), []);
  const closeClearConfirmation = useCallback(() => setClearConfirmationOpen(false), []);
  const closeImportConfirmation = useCallback(() => setPendingImport(null), []);

  const handleSaveReminder = (input: ReminderInput): void => {
    if (editor && editor !== 'new') {
      setData((current) => ({
        ...current,
        reminders: current.reminders.map((reminder) =>
          reminder.id === editor.id ? { ...reminder, ...input } : reminder,
        ),
        snoozes: current.snoozes.filter(
          (snooze) =>
            snooze.reminderId !== editor.id || (input.enabled && input.times.includes(snooze.time)),
        ),
      }));
      showToast('Lembrete atualizado.');
    } else {
      const reminder: Reminder = {
        ...input,
        id: createId(),
        history: {},
        createdAt: new Date().toISOString(),
      };
      setData((current) => ({ ...current, reminders: [...current.reminders, reminder] }));
      setSelectedDate(input.startDate);
      showToast('Lembrete criado com sucesso.');
    }
    setEditor(null);
  };

  const handleToggleReminder = (target: Reminder): void => {
    setData((current) => ({
      ...current,
      reminders: current.reminders.map((reminder) =>
        reminder.id === target.id ? { ...reminder, enabled: !reminder.enabled } : reminder,
      ),
      snoozes: target.enabled
        ? current.snoozes.filter((snooze) => snooze.reminderId !== target.id)
        : current.snoozes,
    }));
    showToast(target.enabled ? 'Lembrete pausado.' : 'Lembrete reativado.', 'neutral');
  };

  const handleDeleteReminder = (): void => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setData((current) => ({
      ...current,
      reminders: current.reminders.filter((reminder) => reminder.id !== targetId),
      snoozes: current.snoozes.filter((snooze) => snooze.reminderId !== targetId),
      alertedDoseKeys: Object.fromEntries(
        Object.entries(current.alertedDoseKeys).filter(([key]) => !key.startsWith(`${targetId}|`)),
      ),
    }));
    setAlertQueue((current) => current.filter((item) => item.reminderId !== targetId));
    setDeleteTarget(null);
    showToast('Lembrete excluído.', 'neutral');
  };

  const handleDoseStatus = useCallback(
    (occurrence: DoseOccurrence, status: ReminderStatus): void => {
      setData((current) => ({
        ...current,
        reminders: current.reminders.map((reminder) => {
          if (reminder.id !== occurrence.reminderId) return reminder;
          const history = { ...reminder.history };
          const day = { ...(history[occurrence.date] ?? {}) };
          if (day[occurrence.time] === status) delete day[occurrence.time];
          else day[occurrence.time] = status;
          if (Object.keys(day).length === 0) delete history[occurrence.date];
          else history[occurrence.date] = day;
          return { ...reminder, history };
        }),
        snoozes: current.snoozes.filter((snooze) => snooze.doseKey !== occurrence.key),
      }));
      setAlertQueue((current) => current.filter((item) => item.key !== occurrence.key));
    },
    [],
  );

  const dismissCurrentAlert = useCallback((): void => {
    const first = alertQueue[0];
    if (first?.snoozed) {
      setData((appData) => ({
        ...appData,
        snoozes: appData.snoozes.filter((snooze) => `snooze|${snooze.id}` !== first.alertKey),
      }));
    }
    setAlertQueue((current) => current.slice(1));
  }, [alertQueue]);

  const snoozeCurrentAlert = (): void => {
    const occurrence = alertQueue[0];
    if (!occurrence) return;
    const dueAt = new Date(Date.now() + 10 * 60 * 1000);
    const id = createId();
    setData((current) => ({
      ...current,
      snoozes: [
        ...current.snoozes.filter((snooze) => snooze.doseKey !== occurrence.key),
        {
          id,
          doseKey: occurrence.key,
          reminderId: occurrence.reminderId,
          date: occurrence.date,
          time: occurrence.time,
          dueAt: dueAt.toISOString(),
        },
      ],
    }));
    setAlertQueue((current) => current.slice(1));
    showToast('Vamos lembrar novamente em 10 minutos.', 'neutral');
  };

  const requestAlerts = async (): Promise<void> => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      setData((current) => ({
        ...current,
        settings: { ...current.settings, notificationsEnabled: true, alertPromptDismissed: true },
      }));
      if (data.settings.soundEnabled) void playAlarmSound();
      showToast('Notificações ativadas.');
    } else if (permission === 'denied') {
      showToast('As notificações foram bloqueadas pelo navegador.', 'warning');
    } else if (permission === 'unsupported') {
      showToast('Este navegador não oferece notificações.', 'warning');
    }
  };

  const handleSettingsChange = (settings: Partial<UserSettings>): void => {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, ...settings },
    }));
  };

  const testSound = async (): Promise<void> => {
    const played = await playAlarmSound();
    if (played) {
      handleSettingsChange({ soundEnabled: true });
      showToast('Som de teste reproduzido.');
    } else showToast('O navegador não permitiu reproduzir o som.', 'warning');
  };

  const installApp = async (): Promise<void> => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') showToast('Aplicativo instalado.');
    setInstallPrompt(null);
  };

  const exportBackup = (): void => {
    const blob = new Blob([exportAppData(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `remedio-na-hora-${todayKey()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast('Cópia dos dados exportada.');
  };

  const importBackup = (json: string): void => {
    try {
      const imported = importAppData(json);
      setPendingImport(imported);
      setSettingsOpen(false);
    } catch {
      showToast('O arquivo selecionado não é uma cópia válida.', 'warning');
    }
  };

  const confirmImport = (): void => {
    if (!pendingImport) return;
    setData(pendingImport);
    setPendingImport(null);
    setAlertQueue([]);
    setSelectedDate(todayKey());
    showToast('Dados importados com sucesso.');
  };

  const clearAllData = (): void => {
    const clean = createEmptyAppData();
    clean.settings.theme = data.settings.theme;
    setData(clean);
    setAlertQueue([]);
    setSelectedDate(todayKey());
    setClearConfirmationOpen(false);
    showToast('Todos os lembretes foram apagados.', 'neutral');
  };

  const selectedOccurrences = useMemo(
    () => getDosesForDate(data.reminders, selectedDate),
    [data.reminders, selectedDate],
  );
  const todayOccurrences = useMemo(
    () => getDosesForDate(data.reminders, todayKey()),
    [data.reminders],
  );
  const takenToday = todayOccurrences.filter((occurrence) => {
    const reminder = data.reminders.find((item) => item.id === occurrence.reminderId);
    return reminder?.history[occurrence.date]?.[occurrence.time] === ReminderStatus.TAKEN;
  }).length;
  const nextRegularDose = useMemo(() => getNextDose(data.reminders, now), [data.reminders, now]);
  const nextSnooze = useMemo(() => {
    const enabledReminderIds = new Set(
      data.reminders.filter((reminder) => reminder.enabled).map((reminder) => reminder.id),
    );
    const snooze = [...data.snoozes]
      .filter((item) => enabledReminderIds.has(item.reminderId) && new Date(item.dueAt) > now)
      .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))[0];
    if (!snooze) return null;
    const reminder = data.reminders.find((item) => item.id === snooze.reminderId);
    if (!reminder) return null;
    return makeOccurrence(reminder, snooze.date, snooze.time, {
      alertKey: `snooze|${snooze.id}`,
      scheduledAt: new Date(snooze.dueAt),
      snoozed: true,
    });
  }, [data.reminders, data.snoozes, now]);
  const nextDose =
    nextSnooze && (!nextRegularDose || nextSnooze.scheduledAt < nextRegularDose.scheduledAt)
      ? nextSnooze
      : nextRegularDose;
  const adherence = useMemo(
    () =>
      getAdherenceSummary(
        data.reminders,
        startOfLocalDay(addCalendarDays(now, -6)),
        endOfLocalDay(now),
        now,
      ),
    [data.reminders, now],
  );
  const todayProgress = todayOccurrences.length === 0 ? 0 : Math.round((takenToday / todayOccurrences.length) * 100);
  const activeReminders = data.reminders.filter((reminder) => reminder.enabled).length;
  const currentAlert = alertQueue[0];
  const shouldPromptAlerts =
    data.reminders.length > 0 &&
    notificationPermission !== 'granted' &&
    !data.settings.alertPromptDismissed;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <a className="brand" href={import.meta.env.BASE_URL} aria-label="Remédio na Hora — início">
            <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} width="44" height="44" alt="" />
            <span><strong>Remédio na Hora</strong><small>Cuidado no tempo certo</small></span>
          </a>
          <nav className="header-actions" aria-label="Ações do aplicativo">
            {installPrompt && !isInstalled && (
              <button type="button" className="button button--soft button--small header-install" onClick={() => void installApp()}>
                <Icon name="download" size={17} /> Instalar
              </button>
            )}
            <button
              type="button"
              className="icon-button header-icon-button"
              onClick={() => {
                if (notificationPermission === 'default') void requestAlerts();
                else setSettingsOpen(true);
              }}
              aria-label="Configurar alertas"
            >
              <Icon name="bell" />
              {notificationPermission !== 'granted' && <span className="attention-dot" />}
            </button>
            <button
              type="button"
              className="icon-button header-icon-button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Abrir configurações"
            >
              <Icon name="settings" />
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <section className="welcome-row">
          <div>
            <span className="eyebrow">{formatLongDate(parseLocalDate(todayKey()))}</span>
            <h1>{getGreeting(now)} <span aria-hidden="true">👋</span></h1>
            <p>{data.reminders.length ? 'Confira sua agenda e mantenha seu cuidado em dia.' : 'Vamos organizar sua rotina de medicamentos?'}</p>
          </div>
          <button type="button" className="button button--primary button--large" onClick={() => setEditor('new')}>
            <Icon name="plus" size={20} /> Novo lembrete
          </button>
        </section>

        {shouldPromptAlerts && (
          <aside className="alert-setup-banner" aria-label="Ativar alertas">
            <span className="alert-setup-banner__icon"><Icon name="bell" size={23} /></span>
            <div>
              <strong>Não perca o próximo horário</strong>
              <p>Ative as notificações para receber alertas enquanto o app estiver disponível no dispositivo.</p>
            </div>
            <button type="button" className="button button--light button--small" onClick={() => void requestAlerts()}>
              Ativar alertas
            </button>
            <button
              type="button"
              className="icon-button icon-button--on-color"
              onClick={() => handleSettingsChange({ alertPromptDismissed: true })}
              aria-label="Dispensar aviso"
            >
              <Icon name="close" size={18} />
            </button>
          </aside>
        )}

        <section className="summary-grid" aria-label="Resumo da rotina">
          <article className="summary-card summary-card--primary">
            <div className="summary-card__icon"><Icon name="clock" size={24} /></div>
            <div className="summary-card__content">
              <span>Próxima dose</span>
              <strong>{nextDose?.medicationName ?? 'Agenda livre'}</strong>
              <p>{formatNextDose(nextDose, now)}{nextDose?.dosage ? ` · ${nextDose.dosage}` : ''}</p>
            </div>
          </article>

          <article className="summary-card">
            <div className="summary-card__top">
              <div className="summary-card__icon summary-card__icon--teal"><Icon name="check" size={22} /></div>
              <span className="summary-card__value">{takenToday}/{todayOccurrences.length}</span>
            </div>
            <strong>Doses tomadas hoje</strong>
            <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={todayProgress}>
              <span style={{ width: `${todayProgress}%` }} />
            </div>
            <p>{todayOccurrences.length === 0 ? 'Nenhuma dose programada' : `${todayProgress}% concluído`}</p>
          </article>

          <article className="summary-card">
            <div className="summary-card__top">
              <div className="summary-card__icon summary-card__icon--blue"><Icon name="target" size={22} /></div>
              <span className="summary-card__value">{adherence.percentage === null ? '—' : `${adherence.percentage}%`}</span>
            </div>
            <strong>Acompanhamento em 7 dias</strong>
            <p>{adherence.total === 0 ? 'Sem doses anteriores' : `${adherence.taken} de ${adherence.total} doses registradas como tomadas`}</p>
          </article>

          <article className="summary-card summary-card--compact">
            <div className="summary-card__icon summary-card__icon--amber"><Icon name="pill" size={22} /></div>
            <div>
              <span>Lembretes ativos</span>
              <strong>{activeReminders}</strong>
              <p>{data.reminders.length - activeReminders} pausado{data.reminders.length - activeReminders === 1 ? '' : 's'}</p>
            </div>
          </article>
        </section>

        <div className="dashboard-grid">
          <div className="dashboard-primary">
            <DoseList
              occurrences={selectedOccurrences}
              reminders={data.reminders}
              selectedDate={selectedDate}
              now={now}
              onStatus={handleDoseStatus}
              onAddReminder={() => setEditor('new')}
            />
            <Calendar
              key={selectedDate.slice(0, 7)}
              reminders={data.reminders}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>
          <aside className="dashboard-sidebar">
            <ReminderList
              reminders={data.reminders}
              onAdd={() => setEditor('new')}
              onEdit={setEditor}
              onDelete={setDeleteTarget}
              onToggle={handleToggleReminder}
            />
          </aside>
        </div>

        <footer className="app-footer">
          <div><Icon name="shield" size={18} /><span>Seus dados ficam salvos somente neste dispositivo.</span></div>
          <p>Este aplicativo não substitui orientação médica. Em caso de dúvida, procure um profissional de saúde.</p>
        </footer>
      </main>

      {editor && (
        <AddReminderModal
          reminder={editor === 'new' ? undefined : editor}
          onClose={closeEditor}
          onSave={handleSaveReminder}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={data.settings}
          notificationPermission={notificationPermission}
          canInstall={Boolean(installPrompt)}
          isInstalled={isInstalled}
          onClose={closeSettings}
          onSettingsChange={handleSettingsChange}
          onRequestNotifications={() => void requestAlerts()}
          onTestSound={() => void testSound()}
          onInstall={() => void installApp()}
          onExport={exportBackup}
          onImport={importBackup}
          onClear={() => {
            setSettingsOpen(false);
            setClearConfirmationOpen(true);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir lembrete?"
          message={`O lembrete de ${deleteTarget.medicationName} e todo o histórico relacionado serão removidos deste dispositivo.`}
          confirmLabel="Excluir lembrete"
          onConfirm={handleDeleteReminder}
          onClose={closeDeleteConfirmation}
        />
      )}

      {pendingImport && (
        <ConfirmDialog
          title="Substituir os dados atuais?"
          message={`A cópia contém ${pendingImport.reminders.length} ${pendingImport.reminders.length === 1 ? 'lembrete' : 'lembretes'}. Ao continuar, os dados atuais deste navegador serão substituídos.`}
          confirmLabel="Importar e substituir"
          tone="primary"
          onConfirm={confirmImport}
          onClose={closeImportConfirmation}
        />
      )}

      {clearConfirmationOpen && (
        <ConfirmDialog
          title="Apagar todos os dados?"
          message="Todos os lembretes, registros e adiamentos serão removidos permanentemente deste navegador. Exporte uma cópia antes, se precisar."
          confirmLabel="Apagar tudo"
          onConfirm={clearAllData}
          onClose={closeClearConfirmation}
        />
      )}

      {currentAlert && (
        <NotificationModal
          occurrence={currentAlert}
          remainingAlerts={alertQueue.length - 1}
          onTaken={() => handleDoseStatus(currentAlert, ReminderStatus.TAKEN)}
          onSkipped={() => handleDoseStatus(currentAlert, ReminderStatus.SKIPPED)}
          onSnooze={snoozeCurrentAlert}
          onDismiss={dismissCurrentAlert}
        />
      )}

      {toast && (
        <div className={`toast toast--${toast.tone}`} role="status" key={toast.id}>
          <Icon name={toast.tone === 'warning' ? 'info' : 'check'} size={19} />
          {toast.message}
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar mensagem"><Icon name="close" size={16} /></button>
        </div>
      )}
    </div>
  );
};

export default App;
