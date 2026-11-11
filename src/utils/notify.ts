
// Notificações do sistema (Web Notification API), para avisar da dose
// mesmo com o app em segundo plano, e vibração em aparelhos móveis.
// Tudo protegido por feature-detect: navegadores sem suporte (ex.: iOS
// Safari fora do PWA instalado) simplesmente continuam com o modal interno.

export type NotificationSupport = 'granted' | 'denied' | 'default' | 'unsupported';

export const notificationsSupported = (): boolean =>
    typeof window !== 'undefined' && 'Notification' in window;

export const notificationStatus = (): NotificationSupport =>
    notificationsSupported() ? Notification.permission : 'unsupported';

/** Pede permissão ao usuário (deve ser chamado a partir de um clique). */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
    if (!notificationsSupported()) return 'unsupported';
    try {
        return await Notification.requestPermission();
    } catch {
        return 'denied';
    }
}

/** Ícone de notificação: mesmo visual do manifesto (fundo azul com pílula),
 * agora em PNG (o SVG era ignorado por vários navegadores). Caminho relativo
 * funciona em qualquer base (/, /remedios_app/). */
const NOTIFICATION_ICON = 'icon-192.png';

/**
 * Mostra uma notificação do sistema; só dispara com permissão concedida.
 * Usamos principalmente quando a página está em segundo plano (aba oculta,
 * celular com a tela apagada), pois em primeiro plano o app já mostra o
 * modal com som. Erros são silenciosos — o modal interno é o fallback.
 */
export function showSystemNotification(title: string, body: string, tag?: string): void {
    if (!notificationsSupported() || Notification.permission !== 'granted') return;
    try {
        const notification = new Notification(title, {
            body,
            tag,
            icon: NOTIFICATION_ICON,
            silent: false,
        });
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch {
        // Alguns ambientes lançam ao criar (ex.: permissão revogada): ignora.
    }
}

/** Vibração curta de alarme; silenciosa onde não há suporte. */
export function vibrateAlarm(): void {
    try {
        navigator.vibrate?.([300, 150, 300]);
    } catch {
        // Sem suporte: ignora.
    }
}
