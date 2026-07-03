import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, scopeToTenant, requireTenantScope } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, scopeToTenant, requireTenantScope, async (req, res) => {
  try {
    const tenantId = req.effectiveTenantId as string;

    const credential = await prisma.metaCredential.findUnique({ where: { tenantId } });
    if (!credential) {
      return res.status(404).json({ error: 'Credenciais Meta não configuradas para este tenant.' });
    }

    return res.json(credential);
  } catch (err) {
    console.error('Erro ao buscar credenciais Meta:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar credenciais Meta.' });
  }
});

router.put('/', requireAuth, scopeToTenant, requireTenantScope, async (req, res) => {
  try {
    const tenantId = req.effectiveTenantId as string;
    const { wabaId, phoneNumberId, accessToken } = req.body ?? {};

    if (!wabaId || !phoneNumberId || !accessToken) {
      return res.status(400).json({ error: 'wabaId, phoneNumberId e accessToken são obrigatórios.' });
    }

    const credential = await prisma.metaCredential.upsert({
      where: { tenantId },
      update: { wabaId, phoneNumberId, accessToken },
      create: { tenantId, wabaId, phoneNumberId, accessToken },
    });

    return res.json(credential);
  } catch (err) {
    console.error('Erro ao salvar credenciais Meta:', err);
    return res.status(500).json({ error: 'Erro interno ao salvar credenciais Meta.' });
  }
});

export default router;
