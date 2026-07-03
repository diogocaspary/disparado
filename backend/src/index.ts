import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import metaCredentialsRoutes from './routes/metaCredentials';
import templatesRoutes from './routes/templates';
import contactsRoutes from './routes/contacts';
import campaignsRoutes from './routes/campaigns';
import adminRoutes from './routes/admin';
import { startDispatcher } from './jobs/dispatcher';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'uneixo-broadcaster-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/meta-credentials', metaCredentialsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

const PORT = Number(process.env.PORT) || 3333;

app.listen(PORT, () => {
  console.log(`Uneixo Broadcaster backend rodando na porta ${PORT}`);
  startDispatcher();
});
