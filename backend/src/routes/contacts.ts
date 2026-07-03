import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { prisma } from '../lib/prisma';
import { requireAuth, scopeToTenant, requireTenantScope } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const KNOWN_COLUMNS = new Set(['nome', 'whatsapp', 'valor_plano', 'data_vencimento', 'codigo_fatura']);

router.post(
  '/upload',
  requireAuth,
  scopeToTenant,
  requireTenantScope,
  upload.single('file'),
  async (req, res) => {
    try {
      const tenantId = req.effectiveTenantId as string;

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo CSV enviado (campo "file").' });
      }

      let records: Record<string, string>[];
      try {
        records = parse(req.file.buffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (parseErr: any) {
        return res.status(400).json({ error: 'Erro ao ler o CSV.', details: parseErr.message });
      }

      if (!records.length) {
        return res.status(400).json({ error: 'CSV vazio ou sem linhas válidas.' });
      }

      const created = [];
      for (const record of records) {
        const { nome, whatsapp, valor_plano, data_vencimento, codigo_fatura, ...rest } = record;

        if (!nome || !whatsapp) {
          continue;
        }

        const extraFields: Record<string, string> = {};
        for (const [key, value] of Object.entries(rest)) {
          if (!KNOWN_COLUMNS.has(key)) {
            extraFields[key] = value;
          }
        }

        const contact = await prisma.contact.create({
          data: {
            tenantId,
            name: nome,
            whatsapp,
            planValue: valor_plano ?? '',
            dueDate: data_vencimento ?? '',
            invoiceCode: codigo_fatura ?? '',
            extraFieldsJson: Object.keys(extraFields).length ? JSON.stringify(extraFields) : null,
          },
        });

        created.push(contact);
      }

      return res.json({
        preview: created.slice(0, 10),
        createdCount: created.length,
        contactIds: created.map((c) => c.id),
      });
    } catch (err) {
      console.error('Erro ao processar upload de contatos:', err);
      return res.status(500).json({ error: 'Erro interno ao processar upload de contatos.' });
    }
  }
);

export default router;
