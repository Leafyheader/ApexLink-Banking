"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemSettings = getSystemSettings;
exports.getWithdrawalFee = getWithdrawalFee;
const client_1 = require("@prisma/client");
const SETTINGS_ID = 1;
async function getSystemSettings(client) {
    const existing = await client.systemSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (existing)
        return existing;
    try {
        return await client.systemSettings.create({ data: { id: SETTINGS_ID } });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return await client.systemSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
        }
        throw error;
    }
}
async function getWithdrawalFee(client) {
    const settings = await getSystemSettings(client);
    return Number(settings.withdrawalFee);
}
