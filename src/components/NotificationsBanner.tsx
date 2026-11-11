
import React, { useState } from 'react';
import { BellIcon, XIcon } from '../constants';
import { notificationStatus, requestNotificationPermission } from '../utils/notify';

const DISMISS_KEY = 'notifBannerDismissed';

/**
 * Banner discreto para pedir permissão de notificações do sistema.
 * Só aparece quando o navegador suporta e a permissão ainda não foi
 * decidida; "Agora não" guarda a recusa para não insistir.
 */
const NotificationsBanner: React.FC = () => {
    // Leitura one-shot do localStorage no initializer (app é 100% cliente,
    // sem SSR): evita effect com setState que só causaria uma renderização extra.
    const [visible, setVisible] = useState<boolean>(() => {
        let dismissed = false;
        try {
            dismissed = localStorage.getItem(DISMISS_KEY) === '1';
        } catch {
            // localStorage indisponível: não insiste neste navegador
        }
        return notificationStatus() === 'default' && !dismissed;
    });

    if (!visible) return null;

    const dismiss = () => {
        setVisible(false);
        try {
            localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // ignora: só volta a pedir na próxima sessão
        }
    };

    const activate = async () => {
        const result = await requestNotificationPermission();
        setVisible(false);
        if (result !== 'granted') dismiss();
    };

    return (
        <div className="container mx-auto px-4 md:px-6 mt-4" data-testid="notifications-banner">
            <div className="max-w-3xl mx-auto flex items-start gap-3 bg-blue-50 dark:bg-brand-gray-800 border border-blue-200 dark:border-brand-gray-600 rounded-xl p-4">
                <BellIcon className="w-6 h-6 text-brand-blue flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-brand-gray-700 dark:text-brand-gray-200">
                    <p className="font-semibold">Receba o aviso da dose mesmo fora do app</p>
                    <p className="mt-0.5 text-brand-gray-600 dark:text-brand-gray-300">
                        Ative as notificações para ser avisado quando o app estiver em segundo plano.
                    </p>
                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={activate}
                            className="px-4 py-1.5 rounded-md text-sm font-semibold bg-brand-blue text-white hover:bg-blue-600 transition-colors"
                        >
                            Ativar notificações
                        </button>
                        <button
                            onClick={dismiss}
                            className="px-4 py-1.5 rounded-md text-sm font-semibold text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700 transition-colors"
                        >
                            Agora não
                        </button>
                    </div>
                </div>
                <button onClick={dismiss} aria-label="Dispensar aviso" className="text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-brand-gray-200">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default NotificationsBanner;
