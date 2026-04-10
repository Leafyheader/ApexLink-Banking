"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditEventById = exports.getAuditEvents = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function parseDate(input) {
    if (typeof input !== 'string' || !input.trim()) {
        return null;
    }
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
}
const getAuditEvents = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const pageRaw = Number.parseInt(String((_a = req.query.page) !== null && _a !== void 0 ? _a : '1'), 10);
        const limitRaw = Number.parseInt(String((_b = req.query.limit) !== null && _b !== void 0 ? _b : '20'), 10);
        const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
        const offset = (page - 1) * limit;
        const search = String((_c = req.query.search) !== null && _c !== void 0 ? _c : '').trim();
        const outcome = String((_d = req.query.outcome) !== null && _d !== void 0 ? _d : '').trim().toUpperCase();
        const action = String((_e = req.query.action) !== null && _e !== void 0 ? _e : '').trim().toUpperCase();
        const entityType = String((_f = req.query.entityType) !== null && _f !== void 0 ? _f : '').trim().toUpperCase();
        const actorRole = String((_g = req.query.actorRole) !== null && _g !== void 0 ? _g : '').trim().toUpperCase();
        const dateFrom = parseDate(req.query.dateFrom);
        const dateTo = parseDate(req.query.dateTo);
        const whereClauses = [];
        const params = [];
        if (search) {
            whereClauses.push('(requestId LIKE ? OR reference LIKE ? OR route LIKE ? OR entityId LIKE ? OR actorUserId LIKE ?)');
            const wildcard = `%${search}%`;
            params.push(wildcard, wildcard, wildcard, wildcard, wildcard);
        }
        if (outcome) {
            whereClauses.push('outcome = ?');
            params.push(outcome);
        }
        if (action) {
            whereClauses.push('action = ?');
            params.push(action);
        }
        if (entityType) {
            whereClauses.push('entityType = ?');
            params.push(entityType);
        }
        if (actorRole) {
            whereClauses.push('actorRole = ?');
            params.push(actorRole);
        }
        if (dateFrom) {
            whereClauses.push('createdAt >= ?');
            params.push(dateFrom);
        }
        if (dateTo) {
            whereClauses.push('createdAt <= ?');
            params.push(dateTo);
        }
        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const countRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM AuditEvent ${whereSql}`, ...params);
        const events = await prisma.$queryRawUnsafe(`
        SELECT
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
        FROM AuditEvent
        ${whereSql}
        ORDER BY createdAt DESC, id DESC
        LIMIT ? OFFSET ?
      `, ...params, limit, offset);
        const total = Number((_j = (_h = countRows[0]) === null || _h === void 0 ? void 0 : _h.total) !== null && _j !== void 0 ? _j : 0);
        res.json({
            events,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Error fetching audit events:', error);
        res.status(500).json({ message: 'Failed to fetch audit events' });
    }
};
exports.getAuditEvents = getAuditEvents;
const getAuditEventById = async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await prisma.$queryRawUnsafe(`
        SELECT
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
        FROM AuditEvent
        WHERE id = ?
        LIMIT 1
      `, id);
        if (rows.length === 0) {
            res.status(404).json({ message: 'Audit event not found' });
            return;
        }
        res.json({ event: rows[0] });
    }
    catch (error) {
        console.error('Error fetching audit event by id:', error);
        res.status(500).json({ message: 'Failed to fetch audit event details' });
    }
};
exports.getAuditEventById = getAuditEventById;
