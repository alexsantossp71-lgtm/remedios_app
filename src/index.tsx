import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryState {
  failed: boolean;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Falha inesperada na aplicação', error, info);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <main className="fatal-error">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width="72" height="72" />
          <h1>Não foi possível abrir o aplicativo</h1>
          <p>Seus dados continuam salvos neste dispositivo. Recarregue a página para tentar novamente.</p>
          <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
            Recarregar página
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.warn('Não foi possível registrar o modo offline.', error);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento raiz não encontrado.');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
