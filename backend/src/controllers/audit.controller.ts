import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types/auth';

const prisma = new PrismaClient();

interface AuditEventRow {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  action: string;
  outcome: string;
  actorUserId: string | null;
  actorRole: string | null;
  actorName: string | null;
  actorUsername: string | null;
  requestId: string | null;
  method: string | null;
  route: string | null;
  reference: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  beforeData: unknown;
  afterData: unknown;
  metadata: unknown;
  prevHash: string | null;
  eventHash: string;
  createdAt: Date;
}

function parseDate(input: unknown): Date | null {
  if (typeof input !== 'string' || !input.trim()) {
    return null;
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export const getAuditEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pageRaw = Number.parseInt(String(req.query.page ?? '1'), 10);
    const limitRaw = Number.parseInt(String(req.query.limit ?? '20'), 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const offset = (page - 1) * limit;

    const search = String(req.query.search ?? '').trim();
    const outcome = String(req.query.outcome ?? '').trim().toUpperCase();
    const action = String(req.query.action ?? '').trim().toUpperCase();
    const entityType = String(req.query.entityType ?? '').trim().toUpperCase();
    const actorRole = String(req.query.actorRole ?? '').trim().toUpperCase();

    const dateFrom = parseDate(req.query.dateFrom);
    const dateTo = parseDate(req.query.dateTo);

    const whereClauses: string[] = [];
    const params: Array<string | number | Date> = [];

    if (search) {
      whereClauses.push('(ae.requestId LIKE ? OR ae.reference LIKE ? OR ae.route LIKE ? OR ae.entityId LIKE ? OR ae.actorUserId LIKE ? OR u.name LIKE ? OR u.username LIKE ?)');
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
    }

    if (outcome) {
      whereClauses.push('ae.outcome = ?');
      params.push(outcome);
    }

    if (action) {
      whereClauses.push('ae.action = ?');
      params.push(action);
    }

    if (entityType) {
      whereClauses.push('ae.entityType = ?');
      params.push(entityType);
    }

    if (actorRole) {
      whereClauses.push('ae.actorRole = ?');
      params.push(actorRole);
    }

    if (dateFrom) {
      whereClauses.push('ae.createdAt >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClauses.push('ae.createdAt <= ?');
      params.push(dateTo);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRows = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
      `SELECT COUNT(*) as total FROM AuditEvent ae LEFT JOIN User u ON u.id = ae.actorUserId ${whereSql}`,
      ...params
    );

    const events = await prisma.$queryRawUnsafe<AuditEventRow[]>(
      `
        SELECT
          ae.id,
          ae.eventType,
          ae.entityType,
          ae.entityId,
          ae.action,
          ae.outcome,
          ae.actorUserId,
          ae.actorRole,
          u.name AS actorName,
          u.username AS actorUsername,
          ae.requestId,
          ae.method,
          ae.route,
          ae.reference,
          ae.ipAddress,
          ae.userAgent,
          ae.beforeData,
          ae.afterData,
          ae.metadata,
          ae.prevHash,
          ae.eventHash,
          ae.createdAt
        FROM AuditEvent ae
        LEFT JOIN User u ON u.id = ae.actorUserId
        ${whereSql}
        ORDER BY ae.createdAt DESC, ae.id DESC
        LIMIT ? OFFSET ?
      `,
      ...params,
      limit,
      offset
    );

    const total = Number(countRows[0]?.total ?? 0);

    res.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit events:', error);
    res.status(500).json({ message: 'Failed to fetch audit events' });
  }
};

export const getAuditEventById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const rows = await prisma.$queryRawUnsafe<AuditEventRow[]>(
      `
        SELECT
          ae.id,
          ae.eventType,
          ae.entityType,
          ae.entityId,
          ae.action,
          ae.outcome,
          ae.actorUserId,
          ae.actorRole,
          u.name AS actorName,
          u.username AS actorUsername,
          ae.requestId,
          ae.method,
          ae.route,
          ae.reference,
          ae.ipAddress,
          ae.userAgent,
          ae.beforeData,
          ae.afterData,
          ae.metadata,
          ae.prevHash,
          ae.eventHash,
          ae.createdAt
        FROM AuditEvent ae
        LEFT JOIN User u ON u.id = ae.actorUserId
        WHERE ae.id = ?
        LIMIT 1
      `,
      id
    );

    if (rows.length === 0) {
      res.status(404).json({ message: 'Audit event not found' });
      return;
    }

    res.json({ event: rows[0] });
  } catch (error) {
    console.error('Error fetching audit event by id:', error);
    res.status(500).json({ message: 'Failed to fetch audit event details' });
  }
};