import { FormEvent, useEffect, useState } from 'react';
import apiClient, { getApiErrorMessage } from '../api/client';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import type { AdminUser, Role, Tenant } from '../types';

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New tenant form
  const [newTenantName, setNewTenantName] = useState('');
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  // New user form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<Role>('TENANT_ADMIN');
  const [userTenantId, setUserTenantId] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Editing user
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTenantId, setEditTenantId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [tenantsRes, usersRes] = await Promise.all([
        apiClient.get<Tenant[]>('/admin/tenants'),
        apiClient.get<AdminUser[]>('/admin/users'),
      ]);
      setTenants(tenantsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao carregar dados administrativos.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTenant(e: FormEvent) {
    e.preventDefault();
    setIsCreatingTenant(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post('/admin/tenants', { name: newTenantName });
      setNewTenantName('');
      setSuccess('Tenant criado com sucesso.');
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao criar tenant.'));
    } finally {
      setIsCreatingTenant(false);
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setIsCreatingUser(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post('/admin/users', {
        name: userName,
        email: userEmail,
        password: userPassword,
        role: userRole,
        tenantId: userRole === 'TENANT_ADMIN' ? userTenantId : undefined,
      });
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserRole('TENANT_ADMIN');
      setUserTenantId('');
      setSuccess('Usuário criado com sucesso.');
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao criar usuário.'));
    } finally {
      setIsCreatingUser(false);
    }
  }

  function startEdit(user: AdminUser) {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditTenantId(user.tenantId ?? '');
    setEditPassword('');
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditName('');
    setEditTenantId('');
    setEditPassword('');
  }

  async function handleSaveEdit(userId: string) {
    setIsSavingEdit(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = { name: editName };
      if (editTenantId) payload.tenantId = editTenantId;
      if (editPassword) payload.password = editPassword;
      await apiClient.patch(`/admin/users/${userId}`, payload);
      setSuccess('Usuário atualizado com sucesso.');
      cancelEdit();
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao atualizar usuário.'));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteUser(userId: string, userEmailLabel: string) {
    if (!window.confirm(`Remover o usuário ${userEmailLabel}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      setSuccess('Usuário removido com sucesso.');
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao remover usuário.'));
    }
  }

  if (isLoading) {
    return <Spinner label="Carregando painel administrativo..." />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Admin — Usuários do SaaS</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        Cada tenant representa um cliente totalmente separado dos demais: templates, contatos,
        campanhas e credenciais Meta não são compartilhados entre tenants. Usuários TENANT_ADMIN
        enxergam apenas os dados do tenant ao qual estão vinculados.
      </p>

      <div className="mt-4 space-y-3">
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}
      </div>

      {/* Tenants */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">Tenants (clientes)</h2>

          <form onSubmit={handleCreateTenant} className="mb-4 flex gap-2">
            <input
              type="text"
              required
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="Nome do novo tenant/cliente"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
            />
            <button
              type="submit"
              disabled={isCreatingTenant}
              className="rounded-lg bg-whatsapp px-4 py-2 text-sm font-semibold text-white hover:bg-whatsapp-dark disabled:opacity-50"
            >
              {isCreatingTenant ? 'Criando...' : 'Criar'}
            </button>
          </form>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {tenants.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum tenant cadastrado.</p>
            ) : (
              tenants.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
                  <span className="font-medium text-gray-800">{t.name}</span>
                  <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* New user */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">Criar novo usuário</h2>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                required
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Papel (role)</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as Role)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
              >
                <option value="TENANT_ADMIN">TENANT_ADMIN (admin de um cliente)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (acesso total ao SaaS)</option>
              </select>
            </div>
            {userRole === 'TENANT_ADMIN' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tenant vinculado (dados isolados deste cliente)
                </label>
                <select
                  required
                  value={userTenantId}
                  onChange={(e) => setUserTenantId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp focus:outline-none focus:ring-1 focus:ring-whatsapp"
                >
                  <option value="">Selecione um tenant...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="submit"
              disabled={isCreatingUser}
              className="w-full rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white hover:bg-whatsapp-dark disabled:opacity-50"
            >
              {isCreatingUser ? 'Criando...' : 'Criar usuário'}
            </button>
          </form>
        </div>
      </div>

      {/* Users list */}
      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-gray-900">Usuários</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">E-mail</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Papel</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tenant</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  {editingUserId === u.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge label={u.role} tone={u.role === 'SUPER_ADMIN' ? 'blue' : 'gray'} />
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'TENANT_ADMIN' ? (
                          <select
                            value={editTenantId}
                            onChange={(e) => setEditTenantId(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          >
                            <option value="">Selecione...</option>
                            {tenants.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                        <input
                          type="password"
                          placeholder="Nova senha (opcional)"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(u.id)}
                            disabled={isSavingEdit}
                            className="rounded bg-whatsapp px-2 py-1 text-xs font-semibold text-white hover:bg-whatsapp-dark disabled:opacity-50"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-gray-800">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge label={u.role} tone={u.role === 'SUPER_ADMIN' ? 'blue' : 'gray'} />
                      </td>
                      <td className="px-4 py-3 text-gray-700">{u.tenant?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <button
                            onClick={() => startEdit(u)}
                            className="text-xs font-medium text-whatsapp-darker hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
