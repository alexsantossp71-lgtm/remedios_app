import React, { useState } from 'react';
import { runAiModelDiagnostics, type AiDiagnosticsReport, type AiModelDiagnostic } from '../services/aiDiagnostics';

interface Props {
    onClose: () => void;
}

const ResultLine: React.FC<{ title: string; check: AiModelDiagnostic['interactions'] }> = ({ title, check }) => (
    <div className="flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
            <p className="font-semibold text-brand-gray-700 dark:text-brand-gray-200">{title}</p>
            <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-0.5">{check.message}</p>
        </div>
        <div className="shrink-0 text-right">
            <span className={check.ok ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-red-700 dark:text-red-400 font-semibold'}>
                {check.ok ? 'Aprovado' : 'Falhou'}
            </span>
            <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400">
                {check.latencyMs === null ? '—' : `${(check.latencyMs / 1000).toFixed(1)} s`}
            </p>
        </div>
    </div>
);

const AiDiagnosticsModal: React.FC<Props> = ({ onClose }) => {
    const [running, setRunning] = useState(false);
    const [currentModel, setCurrentModel] = useState('');
    const [results, setResults] = useState<AiModelDiagnostic[]>([]);
    const [error, setError] = useState('');
    const [testedAt, setTestedAt] = useState('');

    const start = async () => {
        setRunning(true);
        setResults([]);
        setError('');
        setTestedAt('');
        setCurrentModel('');
        try {
            const report: AiDiagnosticsReport = await runAiModelDiagnostics((partial, current) => {
                setResults(partial);
                setCurrentModel(current);
            });
            setResults(report.models);
            setTestedAt(report.testedAt);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível executar o diagnóstico.');
        } finally {
            setRunning(false);
            setCurrentModel('');
        }
    };

    const approved = results.filter((item) => item.interactions.ok && item.schedule.ok);
    const fastest = [...approved].sort((a, b) =>
        (a.interactions.latencyMs ?? Infinity) + (a.schedule.latencyMs ?? Infinity)
        - ((b.interactions.latencyMs ?? Infinity) + (b.schedule.latencyMs ?? Infinity))
    )[0];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="ai-diagnostics-title">
            <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-brand-gray-800">
                <div className="flex items-start justify-between gap-4 border-b border-brand-gray-200 p-5 dark:border-brand-gray-700">
                    <div>
                        <h2 id="ai-diagnostics-title" className="text-lg font-bold text-brand-gray-800 dark:text-white">Diagnóstico dos modelos de IA</h2>
                        <p className="mt-1 text-sm text-brand-gray-500 dark:text-brand-gray-400">Comparação real usando o serviço NVIDIA configurado no aplicativo.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={running} className="rounded-md px-2 py-1 text-brand-gray-500 hover:bg-brand-gray-100 disabled:opacity-40 dark:hover:bg-brand-gray-700" aria-label="Fechar">✕</button>
                </div>

                <div className="space-y-4 overflow-y-auto p-5">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                        Os testes usam apenas cenários fictícios (varfarina + ibuprofeno e dois lembretes inventados). Nenhum medicamento, horário ou dado pessoal cadastrado no seu aparelho é enviado. Cada modelo recebe dois pedidos, com limite de 10 segundos por resposta.
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={start} disabled={running} className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
                            {running ? 'Executando testes…' : results.length ? 'Testar novamente' : 'Iniciar diagnóstico'}
                        </button>
                        {running && <span className="text-sm text-brand-gray-600 dark:text-brand-gray-300">Testando {currentModel || 'catálogo de modelos'}… {results.length} concluído(s)</span>}
                        {testedAt && <span className="text-xs text-brand-gray-500 dark:text-brand-gray-400">Concluído: {new Date(testedAt).toLocaleString('pt-BR')}</span>}
                    </div>

                    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

                    {results.length > 0 && (
                        <div className="space-y-3">
                            {fastest && (
                                <div className="rounded-lg border border-green-300 p-3 dark:border-green-800">
                                    <p className="text-sm font-bold text-green-800 dark:text-green-300">Melhor resultado até agora: {fastest.model}</p>
                                    <p className="mt-1 text-xs text-brand-gray-600 dark:text-brand-gray-300">Passou nos dois testes. Tempo combinado: {(((fastest.interactions.latencyMs ?? 0) + (fastest.schedule.latencyMs ?? 0)) / 1000).toFixed(1)} s.</p>
                                </div>
                            )}
                            {results.map((item) => (
                                <section key={item.model} className="rounded-lg border border-brand-gray-200 p-3 dark:border-brand-gray-700">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="break-all text-sm font-bold text-brand-gray-800 dark:text-white">{item.model}</h3>
                                        <span className={item.interactions.ok && item.schedule.ok ? 'text-xs font-bold text-green-700 dark:text-green-400' : 'text-xs font-bold text-amber-700 dark:text-amber-400'}>
                                            {item.interactions.ok && item.schedule.ok ? 'Passou nos dois' : 'Não passou nos dois'}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        <ResultLine title="Análise de interações" check={item.interactions} />
                                        <div className="border-t border-brand-gray-100 dark:border-brand-gray-700" />
                                        <ResultLine title="Organização de horários" check={item.schedule} />
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}

                    {!running && results.length === 0 && !error && (
                        <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400">O diagnóstico compara os modelos disponíveis e mostra tempo, formato e critérios básicos de segurança. Ele pode levar até cerca de 2 minutos.</p>
                    )}

                    <p className="border-t border-brand-gray-200 pt-3 text-xs text-brand-gray-500 dark:border-brand-gray-700 dark:text-brand-gray-400">
                        Importante: aprovação neste teste técnico não comprova precisão clínica nem substitui uma base farmacológica ou a avaliação de médico/farmacêutico. A velocidade pode variar conforme a carga do serviço e os limites da conta.
                    </p>
                </div>
                <div className="flex justify-end border-t border-brand-gray-200 p-4 dark:border-brand-gray-700">
                    <button type="button" onClick={onClose} disabled={running} className="rounded-lg border border-brand-gray-300 px-4 py-2 text-sm font-semibold text-brand-gray-700 disabled:opacity-40 dark:border-brand-gray-600 dark:text-brand-gray-200">Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default AiDiagnosticsModal;
