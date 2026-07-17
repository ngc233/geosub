require("dotenv/config");

const { randomBytes, scryptSync } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const email = String(process.env.GEOSUB_ADMIN_EMAIL || "")
  .trim()
  .toLowerCase();
const password = String(process.env.GEOSUB_ADMIN_PASSWORD || "");

if (!email || !password || password.length < 14) {
  throw new Error(
    "GEOSUB_ADMIN_EMAIL and GEOSUB_ADMIN_PASSWORD (at least 14 characters) are required."
  );
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const user = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`Admin user does not exist: ${email}`);
  }

  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) },
    }),
    prisma.adminSession.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  console.log(`Admin password rotated and existing sessions revoked: ${email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
