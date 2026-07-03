import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute, SuperAdminRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import CredentialsPage from './pages/CredentialsPage';
import TemplatesPage from './pages/TemplatesPage';
import NewCampaignPage from './pages/NewCampaignPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<CampaignsPage />} />
          <Route path="/campanhas/nova" element={<NewCampaignPage />} />
          <Route path="/campanhas/:id" element={<CampaignDetailPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/credenciais" element={<CredentialsPage />} />

          <Route element={<SuperAdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
}
