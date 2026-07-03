import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, scopeToTenant, requireTenantScope } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, scopeToTenant, requireTenantScope, async (req, res) => {
  try {
    const tenantId = req.effectiveTenantId as string;
    const userId = req.user!.userId;

    const { name, templateId, messagesPerMinute, intervalSeconds, contactIds } = req.body ?? {};

    if (!name || !templateId || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        error: 'name, templateId e contactIds (array não vazio) são obrigatórios.',
      });
    }

    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId, tenantId },
    });
    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado para este tenant.' });
    }

    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, tenantId },
    });
    if (contacts.length !== contactIds.length) {
      return res.status(400).json({ error: 'Um ou mais contactIds são inválidos ou não pertencem a este tenant.' });
    }

    let effectiveMessagesPerMinute = Number(messagesPerMinute) || 0;
    let effectiveIntervalSeconds = Number(intervalSeconds) || 0;

    if (!effectiveIntervalSeconds && effectiveMessagesPerMinute > 0) {
      effectiveIntervalSeconds = Math.ceil(60 / effectiveMessagesPerMinute);
    }
    if (!effectiveMessagesPerMinute && effectiveIntervalSeconds > 0) {
      effectiveMessagesPerMinute = Math.max(1, Math.floor(60 / effectiveIntervalSeconds));
    }
    if (!effectiveMessagesPerMinute && !effectiveIntervalSeconds) {
      return res.status(400).json({
        error: 'Informe messagesPerMinute e/ou intervalSeconds para definir o ritmo de disparo.',
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        templateId,
        name,
        status: 'DRAFT',
        messagesPerMinute: effectiveMessagesPerMinute,
        intervalSeconds: effectiveIntervalSeconds,
        createdById: userId,
      },
    });

    await prisma.$transaction(
      contactIds.map((contactId: string) =>
        prisma.contact.update({
          where: { id: contactId },
          data: { campaignId: campaign.id },
        })
      )
    );

    await prisma.campaignMessage.createMany({
      data: contactIds.map((contactId: string) => ({
        campaignId: campaign.id,
        contactId,
        status: 'PENDING' as const,
      })),
    });

    return res.status(201).json(campaign);
  } catch (err) {
    console.error('Erro ao criar campanha:', err);
    return res.status(500).json({ error: 'Erro interno ao criar campanha.' });
  }
});

router.post('/:id/start', requireAuth, scopeToTenant, requireTenantScope, async (req, res) => {
  try {
    const tenantId = req.effectiveTenantId as string;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({ where: { id, tenantId } });
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        status: 'RUNNING',
        startedAt: campaign.startedAt ?? new Date(),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error('Erro ao iniciar campanha:', err);
    return res.status(500).json({ error: 'Erro interno ao iniciar campanha.' });
  }
});

router.post('/:id/pause', requireAuth, scopeToTenant, requireTenantScope, async (req, res) => {
  try {
    const tenantId = req.effectiveTenantId as string;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({ where: { id, tenantId } });
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    return res.json(updated);
  } catch (err) {
    console.error('Erro ao pausar campanha:', err);
    return res.status(500).json({ error: 'Erro interno ao pausar campanha.' });
  }
});

router.get('/', requireAuth, scopeToTenant, requireTenantScope, async (req, res) => {
  try {
    const tenantId = req.effectiveTenantId as string;

    const campaigns = await prisma.campaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { template: { select: { id: true, name: true } } },
    });

    const campaignsWithCounts = await Promise.all(
      campaigns.map(async (campaign) => {
        const grouped = await prisma.campaignMessage.groupBy({
          by: ['status'],
          where: { campaignId: campaign.id },
          _count: { status: true },
        });

        const statusCounts = grouped.reduce((acc, g) => {
          acc[g.status] = g._count.status;
          return acc;
        }, {} as Record<string, number>);

        return { ...campaign, statusCounts };
      })
    );

    return res.json(campaignsWithCounts);
  } catch (err) {
    console.error('Erro ao listar campanhas:', err);
    return res.status(500).json({ error: 'Erro interno ao listar campanhas.' });
  }
});

router.get('/:id', requireAuth, scopeToTenant, requireTenantScope, async (req, res) => {
  try {
    const tenantId = req.effectiveTenantId as string;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: { template: { select: { id: true, name: true } } },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const grouped = await prisma.campaignMessage.groupBy({
      by: ['status'],
      where: { campaignId: campaign.id },
      _count: { status: true },
    });

    const statusCounts = grouped.reduce((acc, g) => {
      acc[g.status] = g._count.status;
      return acc;
    }, {} as Record<string, number>);

    return res.json({ ...campaign, statusCounts });
  } catch (err) {
    console.error('Erro ao buscar campanha:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar campanha.' });
  }
});

router.get('/:id/messages', requireAuth, scopeToTenant, requireTenantScope, async (req, res) => {
  try {
    const tenantId = req.effectiveTenantId as string;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({ where: { id, tenantId } });
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 20));

    const [messages, total] = await Promise.all([
      prisma.campaignMessage.findMany({
        where: { campaignId: id },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          contact: { select: { id: true, name: true, whatsapp: true } },
        },
      }),
      prisma.campaignMessage.count({ where: { campaignId: id } }),
    ]);

    return res.json({
      data: messages,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('Erro ao listar mensagens da campanha:', err);
    return res.status(500).json({ error: 'Erro interno ao listar mensagens da campanha.' });
  }
});

export default router;
