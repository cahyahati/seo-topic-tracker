import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const defaults = ["SEO Klinik Gigi", "SEO Properti", "SEO B2B SaaS"];

  await Promise.all(
    defaults.map((name) =>
      prisma.project.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
