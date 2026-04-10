import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface AuditEventInput {
  eventType: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE';
  actorUserId?: string | null;
  actorRole?: string | null;
  requestId?: string | null;
  method?: string | null;
  route?: string | null;
  reference?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function toJsonString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

export class AuditTrailService {
  async logEvent(event: AuditEventInput): Promise<void> {
    try {
      const id = crypto.randomUUID();

      const lastHashRows = await prisma.$queryRaw<Array<{ eventHash: string }>>`
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
        entityId: event.entityId ?? null,
        action: event.action,
        outcome: event.outcome,
        actorUserId: event.actorUserId ?? null,
        actorRole: event.actorRole ?? null,
        requestId: event.requestId ?? null,
        method: event.method ?? null,
        route: event.route ?? null,
        reference: event.reference ?? null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        beforeData: event.beforeData ?? null,
        afterData: event.afterData ?? null,
        metadata: event.metadata ?? null,
        createdAt: new Date().toISOString(),
      });

      const eventHash = sha256(`${prevHash ?? ''}|${canonicalPayload}`);

      await prisma.$executeRaw`
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
          ${event.entityId ?? null},
          ${event.action},
          ${event.outcome},
          ${event.actorUserId ?? null},
          ${event.actorRole ?? null},
          ${event.requestId ?? null},
          ${event.method ?? null},
          ${event.route ?? null},
          ${event.reference ?? null},
          ${event.ipAddress ?? null},
          ${event.userAgent ?? null},
          CAST(${toJsonString(event.beforeData)} AS JSON),
          CAST(${toJsonString(event.afterData)} AS JSON),
          CAST(${toJsonString(event.metadata)} AS JSON),
          ${prevHash},
          ${eventHash},
          NOW()
        )
      `;
    } catch (error) {
      // Never block business flow because of audit write failure.
      console.error('Audit logging failure:', error);
    }
  }
}

export const auditTrailService = new AuditTrailService();
