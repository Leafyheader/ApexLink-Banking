import { NextFunction, Response } from 'express';
import { AuthRequest } from '../types/auth';
import { auditTrailService } from '../services/auditTrail.service';

function sanitize(value: unknown): unknown {
  const sensitiveKeys = new Set([
    'password',
    'token',
    'authorization',
    'refreshToken',
    'secret',
    'jwt',
  ]);

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (sensitiveKeys.has(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitize(v);
      }
    }
    return out;
  }

  return value;
}

function actionFrom(method: string, path: string): string {
  const normalized = path.toLowerCase();

  if (normalized.includes('/approve')) return 'APPROVE';
  if (normalized.includes('/reject')) return 'REJECT';
  if (normalized.includes('/reverse')) return 'REVERSE';
  if (normalized.includes('/status')) return 'STATUS_CHANGE';
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  return method;
}

function eventTypeFrom(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length < 2) return 'SYSTEM_EVENT';
  return `${segments[1].toUpperCase()}_EVENT`;
}

function entityTypeFrom(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length < 2) return 'SYSTEM';

  const plural = segments[1].toUpperCase();
  if (plural.endsWith('S')) {
    return plural.slice(0, -1);
  }
  return plural;
}

function extractEntityId(req: AuthRequest, responseBody: any): string | undefined {
  if (typeof req.params?.id === 'string') return req.params.id;
  if (typeof req.params?.accountId === 'string') return req.params.accountId;
  if (typeof req.params?.customerId === 'string') return req.params.customerId;

  if (responseBody?.id) return String(responseBody.id);
  if (responseBody?.transaction?.id) return String(responseBody.transaction.id);
  if (responseBody?.loan?.id) return String(responseBody.loan.id);

  return undefined;
}

function clientIp(req: AuthRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

function requestId(req: AuthRequest): string {
  const existing = req.headers['x-request-id'];
  if (typeof existing === 'string' && existing.trim().length > 0) {
    return existing.trim();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function auditTrailMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
    next();
    return;
  }

  const startedAt = Date.now();
  const reqId = requestId(req);
  let responseBody: any = null;

  const originalJson = res.json.bind(res);
  res.json = ((body: any) => {
    responseBody = body;
    return originalJson(body);
  }) as typeof res.json;

  res.on('finish', () => {
    const status = res.statusCode;
    const outcome = status >= 200 && status < 400 ? 'SUCCESS' : 'FAILURE';
    const method = req.method.toUpperCase();
    const route = req.originalUrl || req.path;

    const actor = req.user as any;

    const payloadSnapshot = {
      params: sanitize(req.params),
      query: sanitize(req.query),
      body: sanitize(req.body),
      status,
      durationMs: Date.now() - startedAt,
      response: sanitize(responseBody),
    };

    const entityType = entityTypeFrom(route);
    const entityId = extractEntityId(req, responseBody);

    void auditTrailService.logEvent({
      eventType: eventTypeFrom(route),
      entityType,
      entityId,
      action: actionFrom(method, route),
      outcome,
      actorUserId: actor?.id ? String(actor.id) : null,
      actorRole: actor?.role ? String(actor.role) : null,
      requestId: reqId,
      method,
      route,
      reference: responseBody?.reference || responseBody?.transaction?.reference || null,
      ipAddress: clientIp(req),
      userAgent: req.get('user-agent') || null,
      afterData: payloadSnapshot,
      metadata: {
        source: 'HTTP_MIDDLEWARE',
      },
    });
  });

  next();
}
