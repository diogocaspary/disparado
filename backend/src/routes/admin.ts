import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireSuperAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireSuperAdmin);

// --- Tenants ---

router.get('/tenants', async (_req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(tenants);
  } catch (err) {
    console.error('Erro ao listar tenants:', err);
    return res.status(500).json({ error: 'Erro interno ao listar tenants.' });
  }
});

router.post('/tenants', async (req, res) => {
  try {
    const { name } = req.body ?? {};
    if (!name) {
      return res.status(400).json({ error: 'name é obrigatório.' });
    }

    const tenant = await prisma.tenant.create({ data: { name } });
    return res.status(201).json(tenant);
  } catch (err) {
    console.error('Erro ao criar tenant:', err);
    return res.status(500).json({ error: 'Erro interno ao criar tenant.' });
  }
});

// --- Users ---

router.get('/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { tenant: true },
    });
    const sanitized = users.map(({ passwordHash, ...rest }) => rest);
    return res.json(sanitized);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    return res.status(500).json({ error: 'Erro interno ao listar usuários.' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { email, password, name, role, tenantId } = req.body ?? {};

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'email, password, name e role são obrigatórios.' });
    }

    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ error: `role inválida. Use um dos valores: ${Object.values(Role).join(', ')}` });
    }

    if (role === Role.TENANT_ADMIN && !tenantId) {
      return res.status(400).json({ error: 'tenantId é obrigatório para role TENANT_ADMIN.' });
    }

    if (role === Role.SUPER_ADMIN && tenantId) {
      return res.status(400).json({ error: 'SUPER_ADMIN não deve ter tenantId.' });
    }

    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        return res.status(404).json({ error: 'tenantId informado não existe.' });
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Já existe um usuário com este email.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        tenantId: role === Role.TENANT_ADMIN ? tenantId : null,
      },
    });

    const { passwordHash: _omit, ...sanitized } = user;
    return res.status(201).json(sanitized);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, tenantId, password } = req.body ?? {};

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) data.name = name;

    if (role !== undefined) {
      if (!Object.values(Role).includes(role)) {
        return res.status(400).json({ error: `role inválida. Use um dos valores: ${Object.values(Role).join(', ')}` });
      }
      data.role = role;
    }

    const effectiveRole = (data.role as Role) ?? user.role;

    if (tenantId !== undefined) {
      if (tenantId) {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
          return res.status(404).json({ error: 'tenantId informado não existe.' });
        }
      }
      data.tenantId = tenantId;
    }

    if (effectiveRole === Role.SUPER_ADMIN) {
      data.tenantId = null;
    } else if (effectiveRole === Role.TENANT_ADMIN) {
      const finalTenantId = (data.tenantId as string | undefined) ?? user.tenantId;
      if (!finalTenantId) {
        return res.status(400).json({ error: 'tenantId é obrigatório para role TENANT_ADMIN.' });
      }
      data.tenantId = finalTenantId;
    }

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({ where: { id }, data });
    const { passwordHash: _omit, ...sanitized } = updated;
    return res.json(sanitized);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    await prisma.user.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao remover usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao remover usuário.' });
  }
});

export default router;
