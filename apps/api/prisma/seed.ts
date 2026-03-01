import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.plan.upsert({
    where: { code: 'free' },
    update: { name: 'Free', monthlyCredits: 10, isActive: true },
    create: { code: 'free', name: 'Free', monthlyCredits: 10 },
  });

  await prisma.plan.upsert({
    where: { code: 'starter' },
    update: { name: 'Starter', monthlyCredits: 80, isActive: true },
    create: { code: 'starter', name: 'Starter', monthlyCredits: 80 },
  });

  await prisma.plan.upsert({
    where: { code: 'pro' },
    update: { name: 'Pro', monthlyCredits: 300, isActive: true },
    create: { code: 'pro', name: 'Pro', monthlyCredits: 300 },
  });

  await prisma.renderTemplate.upsert({
    where: { code: 'template_1' },
    update: { name: 'Template 1', isActive: true },
    create: { code: 'template_1', name: 'Template 1' },
  });

  await prisma.renderTemplate.upsert({
    where: { code: 'template_2' },
    update: { name: 'Template 2', isActive: true },
    create: { code: 'template_2', name: 'Template 2' },
  });

  await prisma.renderTemplate.upsert({
    where: { code: 'template_3' },
    update: { name: 'Template 3', isActive: true },
    create: { code: 'template_3', name: 'Template 3' },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
