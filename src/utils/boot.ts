
// Fluxo de entrada do app (splash → cadastro → app). Funções puras de
// decisão + helpers de flags simples em localStorage (não são dados clínicos:
// apenas booleanos de primeiro uso e do modo demonstração).

export type BootRoute = 'splash' | 'register' | 'app';

export interface BootOptions {
    /** Perfil do usuário já cadastrado? */
    hasProfile: boolean;
    /** Já existe qualquer dado real do usuário (reminders etc.)? */
    hasData: boolean;
    /** Flag "onboarding concluído" deste dispositivo. */
    onboarded: boolean;
}

/**
 * Decide a tela depois do carregamento (o BootLoader roda em toda abertura):
 * - quem já usou o app (onboarded, perfil ou dados reais) vai direto para as
 *   doses do dia ('app'), sem splash nem cadastro;
 * - primeiro uso vê a landing com Demo/Entrar ('splash'); o cadastro em si
 *   é uma etapa seguinte dentro do onboarding ('register').
 */
export function decideBootRoute(options: BootOptions): BootRoute {
    const used = options.onboarded || options.hasProfile || options.hasData;
    return used ? 'app' : 'splash';
}

const tryStorage = (operation: () => void): boolean => {
    try {
        if (typeof localStorage === 'undefined') return false;
        operation();
        return true;
    } catch {
        return false;
    }
};

/** Onboarding concluído (Iniciar ou demo já usados ao menos uma vez). */
export function isOnboardingDone(): boolean {
    let done = false;
    tryStorage(() => { done = localStorage.getItem('onboardingDone') === '1'; });
    return done;
}

export function markOnboardingDone(): void {
    tryStorage(() => { localStorage.setItem('onboardingDone', '1'); });
}

/** Modo demonstração: dados de exemplo só em memória, nunca salvos. */
export function isDemoMode(): boolean {
    let active = false;
    tryStorage(() => { active = localStorage.getItem('demoMode') === '1'; });
    return active;
}

export function setDemoMode(active: boolean): void {
    tryStorage(() => {
        if (active) localStorage.setItem('demoMode', '1');
        else localStorage.removeItem('demoMode');
    });
}
