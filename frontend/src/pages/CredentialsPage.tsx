import { FormEvent, useEffect, useState } from 'react';
import apiClient, { getApiErrorMessage } from '../api/client';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import type { MetaCredential } from '../types';

export default function CredentialsPage() {
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const [existing, setExisting] = useState<MetaCredential | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadCredentials();
  }, []);

  async function loadCredentials() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<MetaCredential>('/meta-credentials');
      setExisting(data);
      setWabaId(data.wabaId);
      setPhoneNumberId(data.phoneNumberId);
      setAccessToken(data.accessToken);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setExisting(null);
      } else {
        setError(getApiErrorMessage(err, 'Erro ao carregar credenciais.'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const { data } = await apiClient.put<MetaCredential>('/meta-credentials', {
        wabaId,
        phoneNumberId,
        accessToken,
      });
      setExisting(data);
      setSuccess('Credenciais salvas com sucesso.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao salvar credenciais.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Credenciais Meta</h1>
      <p className="mt-1 text-sm text-gray-500">
        Configure o acesso à sua conta do WhatsApp Business (Meta Cloud API). Esses dados são
        exclusivos deste tenant e não são compartilhados com outros clientes.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <Spinner label="Carregando credenciais..." />
        ) : (
          <>
            <div className="mb-4">
              {existing ? (
                <Alert type="success">
                  Credenciais salvas. Última atualização em{' '}
                  {new Date(existing.updatedAt).toLocaleString('pt-BR')}.
                </Alert>
              ) : (
                <Alert type="info">Nenhuma credencial configurada ainda para este tenant.</Alert>
              )}
            </div>

            {error && (
              <div className="mb-4">
                <Alert type="error">{error}</Alert>
              </div>
            )}
            {success && (
              <div className="mb-4">
                <Alert type="success">{success}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="wabaId" className="mb-1 block text-sm font-medium text-gray-700">
                  WABA ID (WhatsApp Business Account ID)
                </label>
                <input
                  id="wabaId"
                  type="text"
                  required
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
                  placeholder="Ex: 123456789012345"
                />
              </div>

              <div>
                <label htmlFor="phoneNumberId" className="mb-1 block text-sm font-medium text-gray-700">
                  Phone Number ID
                </label>
                <input
                  id="phoneNumberId"
                  type="text"
                  required
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
                  placeholder="Ex: 987654321098765"
                />
              </div>

              <div>
                <label htmlFor="accessToken" className="mb-1 block text-sm font-medium text-gray-700">
                  Access Token (API Key)
                </label>
                <textarea
                  id="accessToken"
                  required
                  rows={3}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
                  placeholder="Cole aqui o token de acesso permanente gerado no Meta Business"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Salvando...' : 'Salvar credenciais'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
