import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { getApiErrorMessage } from '../api/client';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import type { Campaign, Contact, ContactUploadResponse, MessageTemplate } from '../types';

type Step = 1 | 2 | 3;

export default function NewCampaignPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);

  // Step 1: template
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Step 2: CSV upload
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ContactUploadResponse | null>(null);

  // Step 3: config + create
  const [campaignName, setCampaignName] = useState('');
  const [messagesPerMinute, setMessagesPerMinute] = useState(10);
  const [intervalSeconds, setIntervalSeconds] = useState(6);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function loadTemplates() {
    setIsLoadingTemplates(true);
    setError(null);
    try {
      const { data } = await apiClient.get<MessageTemplate[]>('/templates');
      setTemplates(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao carregar templates.'));
    } finally {
      setIsLoadingTemplates(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setUploadResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<ContactUploadResponse>('/contacts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao enviar o arquivo CSV.'));
    } finally {
      setIsUploading(false);
    }
  }

  function handlePerMinuteChange(value: number) {
    setMessagesPerMinute(value);
    if (value > 0) {
      setIntervalSeconds(Math.ceil(60 / value));
    }
  }

  function handleIntervalChange(value: number) {
    setIntervalSeconds(value);
    if (value > 0) {
      setMessagesPerMinute(Math.max(1, Math.floor(60 / value)));
    }
  }

  async function handleCreateCampaign(e: FormEvent) {
    e.preventDefault();
    if (!selectedTemplateId || !uploadResult) return;

    setIsCreating(true);
    setError(null);
    try {
      const { data } = await apiClient.post<Campaign>('/campaigns', {
        name: campaignName,
        templateId: selectedTemplateId,
        messagesPerMinute,
        intervalSeconds,
        contactIds: uploadResult.contactIds,
      });
      setCreatedCampaign(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao criar campanha.'));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleStartCampaign() {
    if (!createdCampaign) return;
    setIsStarting(true);
    setError(null);
    try {
      await apiClient.post(`/campaigns/${createdCampaign.id}/start`);
      navigate(`/campanhas/${createdCampaign.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao iniciar disparo.'));
    } finally {
      setIsStarting(false);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  const previewColumns = ['name', 'whatsapp', 'planValue', 'dueDate', 'invoiceCode'] as const;
  const columnLabels: Record<(typeof previewColumns)[number], string> = {
    name: 'Nome',
    whatsapp: 'WhatsApp',
    planValue: 'Valor do plano',
    dueDate: 'Data de vencimento',
    invoiceCode: 'Código da fatura',
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Nova campanha</h1>
      <p className="mt-1 text-sm text-gray-500">
        Selecione um template, envie a lista de contatos e configure o ritmo de disparo.
      </p>

      <div className="mt-6 flex items-center gap-2 text-sm font-medium">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                step === s
                  ? 'bg-whatsapp text-white'
                  : step > s
                  ? 'bg-whatsapp/20 text-whatsapp-darker'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
            <span className={step === s ? 'text-gray-900' : 'text-gray-400'}>
              {s === 1 ? 'Template' : s === 2 ? 'Contatos' : 'Ritmo & criação'}
            </span>
            {s < 3 && <span className="mx-2 h-px w-8 bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">1. Selecione um template</h2>
          {isLoadingTemplates ? (
            <Spinner label="Carregando templates..." />
          ) : templates.length === 0 ? (
            <Alert type="info">
              Nenhum template disponível. Vá até a página "Templates" e sincronize com a Meta primeiro.
            </Alert>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {templates.map((tpl) => (
                <label
                  key={tpl.id}
                  className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                    selectedTemplateId === tpl.id
                      ? 'border-whatsapp bg-whatsapp/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="radio"
                      name="template"
                      className="mt-1"
                      checked={selectedTemplateId === tpl.id}
                      onChange={() => setSelectedTemplateId(tpl.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900">{tpl.name}</p>
                        <Badge label={tpl.status} tone={tpl.status === 'APPROVED' ? 'green' : 'gray'} />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{tpl.language} · {tpl.category}</p>
                      <p className="mt-2 line-clamp-3 text-xs text-gray-600">{tpl.bodyText}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              disabled={!selectedTemplateId}
              onClick={() => setStep(2)}
              className="rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-semibold text-gray-900">2. Envie o CSV de contatos</h2>
          <p className="mb-3 text-xs text-gray-500">
            Colunas esperadas: <code className="rounded bg-gray-100 px-1">nome</code>,{' '}
            <code className="rounded bg-gray-100 px-1">whatsapp</code>,{' '}
            <code className="rounded bg-gray-100 px-1">valor_plano</code>,{' '}
            <code className="rounded bg-gray-100 px-1">data_vencimento</code>,{' '}
            <code className="rounded bg-gray-100 px-1">codigo_fatura</code>
          </p>

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-whatsapp/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-whatsapp-darker hover:file:bg-whatsapp/20"
            />
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? 'Enviando...' : 'Enviar CSV'}
            </button>
          </div>

          {uploadResult && (
            <div className="mt-5">
              <Alert type="success">
                {uploadResult.createdCount} contato(s) importado(s) com sucesso. Pré-visualização das
                10 primeiras linhas:
              </Alert>

              <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewColumns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left font-semibold text-gray-600">
                          {columnLabels[col]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {uploadResult.preview.map((c: Contact) => (
                      <tr key={c.id}>
                        <td className="px-3 py-2 text-gray-800">{c.name}</td>
                        <td className="px-3 py-2 text-gray-800">{c.whatsapp}</td>
                        <td className="px-3 py-2 text-gray-800">{c.planValue}</td>
                        <td className="px-3 py-2 text-gray-800">{c.dueDate}</td>
                        <td className="px-3 py-2 text-gray-800">{c.invoiceCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              ← Voltar
            </button>
            <button
              disabled={!uploadResult || uploadResult.createdCount === 0}
              onClick={() => setStep(3)}
              className="rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">3. Ritmo de disparo e criação</h2>

          {!createdCampaign ? (
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label htmlFor="campaignName" className="mb-1 block text-sm font-medium text-gray-700">
                  Nome da campanha
                </label>
                <input
                  id="campaignName"
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
                  placeholder="Ex: Cobrança julho/2026"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="mpm" className="mb-1 block text-sm font-medium text-gray-700">
                    Mensagens por minuto
                  </label>
                  <input
                    id="mpm"
                    type="number"
                    min={1}
                    value={messagesPerMinute}
                    onChange={(e) => handlePerMinuteChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
                  />
                </div>
                <div>
                  <label htmlFor="interval" className="mb-1 block text-sm font-medium text-gray-700">
                    Intervalo entre mensagens (segundos)
                  </label>
                  <input
                    id="interval"
                    type="number"
                    min={1}
                    value={intervalSeconds}
                    onChange={(e) => handleIntervalChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                Template selecionado: <strong>{selectedTemplate?.name}</strong> · Contatos:{' '}
                <strong>{uploadResult?.createdCount}</strong>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  ← Voltar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? 'Criando...' : 'Criar campanha'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert type="success">
                Campanha "{createdCampaign.name}" criada com sucesso (status: {createdCampaign.status}).
              </Alert>
              <div className="flex gap-3">
                <button
                  onClick={handleStartCampaign}
                  disabled={isStarting}
                  className="rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStarting ? 'Iniciando...' : '🚀 Iniciar disparo'}
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Ver campanhas mais tarde
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
