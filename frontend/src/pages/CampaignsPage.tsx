import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { getApiErrorMessage } from '../api/client';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import type { Campaign, CampaignStatus } from '../types';

function statusTone(status: CampaignStatus): 'green' | 'gray' | 'red' | 'yellow' | 'blue' {
  switch (status) {
    case 'RUNNING':
      return 'green';
    case 'COMPLETED':
      return 'blue';
    case 'PAUSED':
      return 'yellow';
    case 'FAILED':
      return 'red';
    default:
      return 'gray';
  }
}

function statusLabel(status: CampaignStatus): string {
  const labels: Record<CampaignStatus, string> = {
    DRAFT: 'Rascunho',
    RUNNING: 'Em andamento',
    PAUSED: 'Pausada',
    COMPLETED: 'Concluída',
    FAILED: 'Falhou',
  };
  return labels[status];
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadCampaigns();
    const interval = setInterval(() => {
      void loadCampaigns(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadCampaigns(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      const { data } = await apiClient.get<Campaign[]>('/campaigns');
      setCampaigns(data);
      setError(null);
    } catch (err) {
      if (!silent) setError(getApiErrorMessage(err, 'Erro ao carregar campanhas.'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
          <p className="mt-1 text-sm text-gray-500">Disparos de mensagens de utilidade via WhatsApp.</p>
        </div>
        <Link
          to="/campanhas/nova"
          className="rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-dark"
        >
          🚀 Nova campanha
        </Link>
      </div>

      {error && (
        <div className="mt-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Carregando campanhas..." />
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            Nenhuma campanha criada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Template</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Enviadas</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Pendentes</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Falhas</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Criada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((c) => {
                  const counts = c.statusCounts ?? {};
                  const sent = (counts.SENT ?? 0) as number;
                  const pending = ((counts.PENDING ?? 0) + (counts.SENDING ?? 0)) as number;
                  const failed = (counts.FAILED ?? 0) as number;
                  return (
                    <tr key={c.id} className="cursor-pointer hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/campanhas/${c.id}`} className="font-medium text-whatsapp-darker hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{c.template?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge label={statusLabel(c.status)} tone={statusTone(c.status)} />
                      </td>
                      <td className="px-4 py-3 text-gray-700">{sent}</td>
                      <td className="px-4 py-3 text-gray-700">{pending}</td>
                      <td className="px-4 py-3 text-gray-700">{failed}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(c.createdAt).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
