import { useEffect, useState } from 'react';
import apiClient, { getApiErrorMessage } from '../api/client';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import type { MessageTemplate } from '../types';

function statusTone(status: string): 'green' | 'gray' | 'red' | 'yellow' {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'green';
    case 'REJECTED':
    case 'DISABLED':
      return 'red';
    case 'PENDING':
    case 'IN_APPEAL':
      return 'yellow';
    default:
      return 'gray';
  }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function loadTemplates() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<MessageTemplate[]>('/templates');
      setTemplates(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao carregar templates.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await apiClient.post<{ syncedCount: number }>('/templates/sync');
      setSuccess(`${data.syncedCount} template(s) sincronizado(s) com a Meta.`);
      await loadTemplates();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao sincronizar templates com a Meta.'));
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Templates de mensagem aprovados na Meta para este tenant.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSyncing ? 'Sincronizando...' : '🔄 Sincronizar com a Meta'}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Carregando templates..." />
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            Nenhum template sincronizado ainda. Configure suas credenciais Meta e clique em
            "Sincronizar com a Meta".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {templates.map((tpl) => (
              <div key={tpl.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{tpl.name}</p>
                    <p className="text-xs text-gray-500">
                      {tpl.language} · {tpl.category} · {tpl.variablesCount} variável(is)
                    </p>
                  </div>
                  <Badge label={tpl.status} tone={statusTone(tpl.status)} />
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {tpl.bodyText || 'Sem corpo de mensagem.'}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Sincronizado em {new Date(tpl.syncedAt).toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
