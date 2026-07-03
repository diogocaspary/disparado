import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiClient, { getApiErrorMessage } from '../api/client';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import type { Campaign, CampaignStatus, MessageStatus, PaginatedMessages } from '../types';

function campaignStatusTone(status: CampaignStatus): 'green' | 'gray' | 'red' | 'yellow' | 'blue' {
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

function campaignStatusLabel(status: CampaignStatus): string {
  const labels: Record<CampaignStatus, string> = {
    DRAFT: 'Rascunho',
    RUNNING: 'Em andamento',
    PAUSED: 'Pausada',
    COMPLETED: 'Concluída',
    FAILED: 'Falhou',
  };
  return labels[status];
}

function messageStatusTone(status: MessageStatus): 'green' | 'gray' | 'red' | 'yellow' {
  switch (status) {
    case 'SENT':
      return 'green';
    case 'FAILED':
      return 'red';
    case 'SENDING':
      return 'yellow';
    default:
      return 'gray';
  }
}

function messageStatusLabel(status: MessageStatus): string {
  const labels: Record<MessageStatus, string> = {
    PENDING: 'Pendente',
    SENDING: 'Enviando',
    SENT: 'Enviada',
    FAILED: 'Falhou',
  };
  return labels[status];
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [messages, setMessages] = useState<PaginatedMessages | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const loadData = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setIsLoading(true);
      try {
        const [campaignRes, messagesRes] = await Promise.all([
          apiClient.get<Campaign>(`/campaigns/${id}`),
          apiClient.get<PaginatedMessages>(`/campaigns/${id}/messages`, { params: { page, pageSize: 20 } }),
        ]);
        setCampaign(campaignRes.data);
        setMessages(messagesRes.data);
        setError(null);
      } catch (err) {
        if (!silent) setError(getApiErrorMessage(err, 'Erro ao carregar campanha.'));
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [id, page]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (campaign?.status !== 'RUNNING') return;
    const interval = setInterval(() => {
      void loadData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [campaign?.status, loadData]);

  async function handleStart() {
    if (!id) return;
    setIsMutating(true);
    setError(null);
    try {
      await apiClient.post(`/campaigns/${id}/start`);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao iniciar campanha.'));
    } finally {
      setIsMutating(false);
    }
  }

  async function handlePause() {
    if (!id) return;
    setIsMutating(true);
    setError(null);
    try {
      await apiClient.post(`/campaigns/${id}/pause`);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao pausar campanha.'));
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) {
    return <Spinner label="Carregando campanha..." />;
  }

  if (!campaign) {
    return (
      <div>
        {error && <Alert type="error">{error}</Alert>}
        <button onClick={() => navigate('/')} className="mt-4 text-sm text-whatsapp-darker hover:underline">
          ← Voltar para campanhas
        </button>
      </div>
    );
  }

  const counts = campaign.statusCounts ?? {};
  const sent = (counts.SENT ?? 0) as number;
  const pending = ((counts.PENDING ?? 0) + (counts.SENDING ?? 0)) as number;
  const failed = (counts.FAILED ?? 0) as number;

  return (
    <div>
      <Link to="/" className="text-sm text-whatsapp-darker hover:underline">
        ← Voltar para campanhas
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <Badge label={campaignStatusLabel(campaign.status)} tone={campaignStatusTone(campaign.status)} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Template: {campaign.template?.name ?? '—'} · {campaign.messagesPerMinute} msg/min ·{' '}
            {campaign.intervalSeconds}s de intervalo
          </p>
        </div>

        <div className="flex gap-2">
          {(campaign.status === 'DRAFT' || campaign.status === 'PAUSED') && (
            <button
              onClick={handleStart}
              disabled={isMutating}
              className="rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-dark disabled:opacity-50"
            >
              ▶ Iniciar disparo
            </button>
          )}
          {campaign.status === 'RUNNING' && (
            <button
              onClick={handlePause}
              disabled={isMutating}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              ⏸ Pausar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Enviadas</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{sent}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Pendentes</p>
          <p className="mt-1 text-2xl font-bold text-gray-600">{pending}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Falhas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{failed}</p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-gray-900">Log de envio por contato</h2>
        {!messages || messages.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            Nenhuma mensagem registrada.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">WhatsApp</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Erro</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Enviada em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {messages.data.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-gray-800">{m.contact.name}</td>
                      <td className="px-4 py-3 text-gray-800">{m.contact.whatsapp}</td>
                      <td className="px-4 py-3">
                        <Badge label={messageStatusLabel(m.status)} tone={messageStatusTone(m.status)} />
                      </td>
                      <td className="px-4 py-3 text-red-600">{m.errorMessage ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {m.sentAt ? new Date(m.sentAt).toLocaleString('pt-BR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <span>
                Página {messages.page} de {messages.totalPages} ({messages.total} mensagens)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Anterior
                </button>
                <button
                  disabled={page >= messages.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Próxima →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
