import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD precisam estar definidos no ambiente.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Usuário SUPER_ADMIN já existe (${email}). Nenhuma ação necessária.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      tenantId: null,
    },
  });

  console.log(`Usuário SUPER_ADMIN criado com sucesso: ${user.email} (id: ${user.id})`);
}

main()
  .catch((err) => {
    console.error('Erro ao rodar seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
