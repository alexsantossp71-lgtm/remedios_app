
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

/** Ícone de notificação: mesmo visual do manifesto (quadrado azul com pílula).
 * Alguns navegadores ignoram SVG — o erro só degrada para o ícone padrão. */
const NOTIFICATION_ICON =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='40' fill='%23007aff'/%3E%3Cg fill='none' stroke='white' stroke-width='14' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M76 140l64-64a31 31 0 1 0-44-44L32 96a31 31 0 1 0 44 44z'/%3E%3Cpath d='M64 64l64 64'/%3E%3C/g%3E%3C/svg%3E";

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
