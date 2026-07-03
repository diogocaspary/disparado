import axios from 'axios';
import { prisma } from '../lib/prisma';

const META_GRAPH_VERSION = 'v20.0';
const TICK_INTERVAL_MS = 1000;

let dispatcherInterval: NodeJS.Timeout | null = null;

/**
 * Monta os parâmetros do corpo (BODY) do template, na ordem:
 * nome, valor_plano, data_vencimento, codigo_fatura, e depois
 * campos extras (extraFieldsJson), até completar variablesCount.
 */
function buildTemplateParameters(
  variablesCount: number,
  contact: { name: string; planValue: string; dueDate: string; invoiceCode: string; extraFieldsJson: string | null }
) {
  const orderedValues: string[] = [contact.name, contact.planValue, contact.dueDate, contact.invoiceCode];

  if (variablesCount > orderedValues.length && contact.extraFieldsJson) {
    try {
      const extra = JSON.parse(contact.extraFieldsJson) as Record<string, string>;
      for (const value of Object.values(extra)) {
        orderedValues.push(String(value));
      }
    } catch {
      // extraFieldsJson malformado: ignora silenciosamente, segue apenas com os campos padrão
    }
  }

  const selected = orderedValues.slice(0, Math.max(0, variablesCount));

  return selected.map((value) => ({
    type: 'text',
    text: value ?? '',
  }));
}

async function processCampaign(campaign: {
  id: string;
  tenantId: string;
  templateId: string;
  messagesPerMinute: number;
  intervalSeconds: number;
}) {
  try {
    const sixtySecondsAgo = new Date(Date.now() - 60_000);

    const sentInLastMinute = await prisma.campaignMessage.count({
      where: {
        campaignId: campaign.id,
        status: 'SENT',
        sentAt: { gte: sixtySecondsAgo },
      },
    });

    if (sentInLastMinute >= campaign.messagesPerMinute) {
      return; // teto de mensagens por minuto atingido
    }

    const lastProcessed = await prisma.campaignMessage.findFirst({
      where: {
        campaignId: campaign.id,
        status: { in: ['SENT', 'FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastProcessed) {
      const referenceTime = lastProcessed.sentAt ?? lastProcessed.createdAt;
      const elapsedSeconds = (Date.now() - referenceTime.getTime()) / 1000;
      if (elapsedSeconds < campaign.intervalSeconds) {
        return; // ainda não passou o intervalo mínimo entre disparos
      }
    }

    const nextMessage = await prisma.campaignMessage.findFirst({
      where: { campaignId: campaign.id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { contact: true },
    });

    if (!nextMessage) {
      // Não há mais pendentes: finaliza a campanha se ainda estiver RUNNING
      const remainingPending = await prisma.campaignMessage.count({
        where: { campaignId: campaign.id, status: 'PENDING' },
      });
      if (remainingPending === 0) {
        await prisma.campaign.updateMany({
          where: { id: campaign.id, status: 'RUNNING' },
          data: { status: 'COMPLETED', finishedAt: new Date() },
        });
      }
      return;
    }

    const [template, credential] = await Promise.all([
      prisma.messageTemplate.findUnique({ where: { id: campaign.templateId } }),
      prisma.metaCredential.findUnique({ where: { tenantId: campaign.tenantId } }),
    ]);

    if (!template || !credential) {
      await prisma.campaignMessage.update({
        where: { id: nextMessage.id },
        data: {
          status: 'FAILED',
          errorMessage: !template
            ? 'Template não encontrado para esta campanha.'
            : 'Credenciais Meta não configuradas para este tenant.',
        },
      });
      return;
    }

    await prisma.campaignMessage.update({
      where: { id: nextMessage.id },
      data: { status: 'SENDING' },
    });

    try {
      const parameters = buildTemplateParameters(template.variablesCount, nextMessage.contact);

      const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${credential.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: nextMessage.contact.whatsapp,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components:
            parameters.length > 0
              ? [
                  {
                    type: 'body',
                    parameters,
                  },
                ]
              : [],
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${credential.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const metaMessageId = response.data?.messages?.[0]?.id ?? null;

      await prisma.campaignMessage.update({
        where: { id: nextMessage.id },
        data: {
          status: 'SENT',
          metaMessageId,
          sentAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (sendErr: any) {
      const errorMessage =
        JSON.stringify(sendErr?.response?.data) || sendErr?.message || 'Erro desconhecido ao enviar mensagem.';

      await prisma.campaignMessage.update({
        where: { id: nextMessage.id },
        data: {
          status: 'FAILED',
          errorMessage: errorMessage.slice(0, 2000),
        },
      });
    }
  } catch (campaignErr) {
    console.error(`Erro ao processar campanha ${campaign.id}:`, campaignErr);
  }
}

async function tick() {
  try {
    const runningCampaigns = await prisma.campaign.findMany({
      where: { status: 'RUNNING' },
    });

    for (const campaign of runningCampaigns) {
      await processCampaign(campaign);
    }
  } catch (err) {
    console.error('Erro no loop do dispatcher:', err);
  }
}

export function startDispatcher() {
  if (dispatcherInterval) {
    return dispatcherInterval;
  }

  dispatcherInterval = setInterval(() => {
    tick().catch((err) => console.error('Erro não tratado no tick do dispatcher:', err));
  }, TICK_INTERVAL_MS);

  console.log('Dispatcher de campanhas iniciado.');
  return dispatcherInterval;
}

export function stopDispatcher() {
  if (dispatcherInterval) {
    clearInterval(dispatcherInterval);
    dispatcherInterval = null;
  }
}
