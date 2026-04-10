"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditTrailService = exports.AuditTrailService = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
function sha256(input) {
    return crypto_1.default.createHash('sha256').update(input).digest('hex');
}
function toJsonString(value) {
    if (value === undefined || value === null)
        return null;
    return JSON.stringify(value);
}
class AuditTrailService {
    async logEvent(event) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        try {
            const id = crypto_1.default.randomUUID();
            const lastHashRows = await prisma.$queryRaw `
        SELECT eventHash
        FROM AuditEvent
        ORDER BY createdAt DESC, id DESC
        LIMIT 1
      `;
            const prevHash = lastHashRows.length > 0 ? lastHashRows[0].eventHash : null;
            const canonicalPayload = JSON.stringify({
                id,
                eventType: event.eventType,
                entityType: event.entityType,
                entityId: (_a = event.entityId) !== null && _a !== void 0 ? _a : null,
                action: event.action,
                outcome: event.outcome,
                actorUserId: (_b = event.actorUserId) !== null && _b !== void 0 ? _b : null,
                actorRole: (_c = event.actorRole) !== null && _c !== void 0 ? _c : null,
                requestId: (_d = event.requestId) !== null && _d !== void 0 ? _d : null,
                method: (_e = event.method) !== null && _e !== void 0 ? _e : null,
                route: (_f = event.route) !== null && _f !== void 0 ? _f : null,
                reference: (_g = event.reference) !== null && _g !== void 0 ? _g : null,
                ipAddress: (_h = event.ipAddress) !== null && _h !== void 0 ? _h : null,
                userAgent: (_j = event.userAgent) !== null && _j !== void 0 ? _j : null,
                beforeData: (_k = event.beforeData) !== null && _k !== void 0 ? _k : null,
                afterData: (_l = event.afterData) !== null && _l !== void 0 ? _l : null,
                metadata: (_m = event.metadata) !== null && _m !== void 0 ? _m : null,
                createdAt: new Date().toISOString(),
            });
            const eventHash = sha256(`${prevHash !== null && prevHash !== void 0 ? prevHash : ''}|${canonicalPayload}`);
            await prisma.$executeRaw `
        INSERT INTO AuditEvent (
          id,
          eventType,
          entityType,
          entityId,
          action,
          outcome,
          actorUserId,
          actorRole,
          requestId,
          method,
          route,
          reference,
          ipAddress,
          userAgent,
          beforeData,
          afterData,
          metadata,
          prevHash,
          eventHash,
          createdAt
        ) VALUES (
          ${id},
          ${event.eventType},
          ${event.entityType},
          ${(_o = event.entityId) !== null && _o !== void 0 ? _o : null},
          ${event.action},
          ${event.outcome},
          ${(_p = event.actorUserId) !== null && _p !== void 0 ? _p : null},
          ${(_q = event.actorRole) !== null && _q !== void 0 ? _q : null},
          ${(_r = event.requestId) !== null && _r !== void 0 ? _r : null},
          ${(_s = event.method) !== null && _s !== void 0 ? _s : null},
          ${(_t = event.route) !== null && _t !== void 0 ? _t : null},
          ${(_u = event.reference) !== null && _u !== void 0 ? _u : null},
          ${(_v = event.ipAddress) !== null && _v !== void 0 ? _v : null},
          ${(_w = event.userAgent) !== null && _w !== void 0 ? _w : null},
          CAST(${toJsonString(event.beforeData)} AS JSON),
          CAST(${toJsonString(event.afterData)} AS JSON),
          CAST(${toJsonString(event.metadata)} AS JSON),
          ${prevHash},
          ${eventHash},
          NOW()
        )
      `;
        }
        catch (error) {
            // Never block business flow because of audit write failure.
            console.error('Audit logging failure:', error);
        }
    }
}
exports.AuditTrailService = AuditTrailService;
exports.auditTrailService = new AuditTrailService();
