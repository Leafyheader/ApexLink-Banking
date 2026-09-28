import { PrismaClient, Prisma } from '@prisma/client';

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

const SETTINGS_ID = 1;

export async function getSystemSettings(client: PrismaClientOrTx) {
  const existing = await client.systemSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;

  try {
    return await client.systemSettings.create({ data: { id: SETTINGS_ID } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return await client.systemSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
    }
    throw error;
  }
}

export async function getWithdrawalFee(client: PrismaClientOrTx): Promise<number> {
  const settings = await getSystemSettings(client);
  return Number(settings.withdrawalFee);
}
