import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId: string | null;
        role: Role;
      };
      effectiveTenantId?: string | null;
    }
  }
}

export {};
