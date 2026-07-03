import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
const linkInactive = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
const linkActive = 'bg-whatsapp/10 text-whatsapp-darker';

function NavItem({ to, label, icon, end }: { to: string; label: string; icon: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-whatsapp text-white text-lg">
          💬
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-gray-900">Uneixo</p>
          <p className="text-sm font-bold leading-tight text-whatsapp-darker">Broadcaster</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavItem to="/" end label="Campanhas" icon="📣" />
        <NavItem to="/campanhas/nova" label="Nova campanha" icon="🚀" />
        <NavItem to="/templates" label="Templates" icon="📄" />
        <NavItem to="/credenciais" label="Credenciais Meta" icon="🔑" />
        {user?.role === 'SUPER_ADMIN' && (
          <>
            <div className="my-3 border-t border-gray-200" />
            <NavItem to="/admin" label="Admin" icon="🛠️" />
          </>
        )}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
        <p className="truncate text-xs text-gray-500">{user?.email}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-whatsapp-darker">
          {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin do Tenant'}
        </p>
        <button
          onClick={logout}
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
