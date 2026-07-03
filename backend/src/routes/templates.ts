import { Router } from 'express';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { requireAuth, scopeToTenant, requireTenantScope } from '../middleware/auth';

const router = Router();

const META_GRAPH_VERSION = 'v20.0';

interface MetaTemplateComponent {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: MetaTemplateComponent[];
}

function extractBodyInfo(components: MetaTemplateComponent[]) {
  const bodyComponent = components.find((c) => c.type === 'BODY');
  const bodyText = bodyComponent?.text ?? '';
  const variableMatches = bodyText.match(/\{\{\s*\d+\s*\}\}/g) ?? [];
  const uniqueVariables = new Set(variableMatches);
  return {
    bodyText,
    variablesCount: uniqueVariables.size,
  };
}

router.post('/sync', requireAuth, scopeToTenant, requireTenantScope, async (req, res) => {
  try {
    const tenantId = req.effectiveTenantId as string;

    const credential = await prisma.metaCredential.findUnique({ where: { tenantId } });
    if (!credential) {
      return res.status(400).json({ error: 'Configure as credenciais Meta antes de sincronizar templates.' });
    }

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${credential.wabaId}/message_templates`;

    const response = await axios.get(url, {
      params: { access_token: credential.accessToken },
    });

    const templates: MetaTemplate[] = response.data?.data ?? [];

    const results = [];
    for (const template of templates) {
      const { bodyText, variablesCount } = extractBodyInfo(template.components ?? []);

      const saved = await prisma.messageTemplate.upsert({
        where: {
          tenantId_metaTemplateId: {
            tenantId,
            metaTemplateId: template.id,
          },
        },
        update: {
          name: template.name,
          language: template.language,
          category: template.category,
          status: template.status,
          bodyText,
          variablesCount,
          componentsJson: JSON.stringify(template.components ?? []),
          syncedAt: new Date(),
        },
        create: {
          tenantId,
          metaTemplateId: template.id,
          name: template.name,
          language: template.language,
          category: template.category,
          status: template.status,
          bodyText,
          variablesCount,
          componentsJson: JSON.stringify(template.components ?? []),
        },
      });

      results.push(saved);
    }

    return res.json({ syncedCount: results.length, templates: results });
  } catch (err: any) {
    console.error('Erro ao sincronizar templates:', err?.response?.data ?? err.message);
    return res.status(500).json({
      error: 'Erro ao sincronizar templates com a Meta.',
      details: err?.response?.data ?? err.message,
    });
  }
});

router.get('/', requireAuth, scopeToTenant, requireTenantScope, async (req, res) => {
  try {
    const tenantId = req.effectiveTenantId as string;

    const templates = await prisma.messageTemplate.findMany({
      where: { tenantId },
      orderBy: { syncedAt: 'desc' },
    });

    return res.json(templates);
  } catch (err) {
    console.error('Erro ao listar templates:', err);
    return res.status(500).json({ error: 'Erro interno ao listar templates.' });
  }
});

export default router;
