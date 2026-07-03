import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

interface JwtPayload {
  userId: string;
  tenantId: string | null;
  role: Role;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação ausente.' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET não configurado no servidor.' });
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId ?? null,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

export function scopeToTenant(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    if (req.user.role === Role.TENANT_ADMIN) {
      if (!req.user.tenantId) {
        return res.status(403).json({ error: 'Usuário TENANT_ADMIN sem tenant associado.' });
      }
      req.effectiveTenantId = req.user.tenantId;
    } else if (req.user.role === Role.SUPER_ADMIN) {
      const overrideTenantId = req.query.tenantId as string | undefined;
      req.effectiveTenantId = overrideTenantId ?? null;
    } else {
      req.effectiveTenantId = null;
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao determinar o tenant da requisição.' });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== Role.SUPER_ADMIN) {
    return res.status(403).json({ error: 'Acesso restrito a SUPER_ADMIN.' });
  }
  next();
}

export function requireTenantScope(req: Request, res: Response, next: NextFunction) {
  if (!req.effectiveTenantId) {
    return res.status(400).json({
      error: 'Nenhum tenant efetivo determinado para esta requisição. Informe ?tenantId= se for SUPER_ADMIN.',
    });
  }
  next();
}
