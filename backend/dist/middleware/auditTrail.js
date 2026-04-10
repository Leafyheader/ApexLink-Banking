"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditTrailMiddleware = auditTrailMiddleware;
const auditTrail_service_1 = require("../services/auditTrail.service");
function sanitize(value) {
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
        const obj = value;
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            if (sensitiveKeys.has(k)) {
                out[k] = '[REDACTED]';
            }
            else {
                out[k] = sanitize(v);
            }
        }
        return out;
    }
    return value;
}
function actionFrom(method, path) {
    const normalized = path.toLowerCase();
    if (normalized.includes('/approve'))
        return 'APPROVE';
    if (normalized.includes('/reject'))
        return 'REJECT';
    if (normalized.includes('/reverse'))
        return 'REVERSE';
    if (normalized.includes('/status'))
        return 'STATUS_CHANGE';
    if (method === 'POST')
        return 'CREATE';
    if (method === 'PUT' || method === 'PATCH')
        return 'UPDATE';
    if (method === 'DELETE')
        return 'DELETE';
    return method;
}
function eventTypeFrom(path) {
    const segments = path.split('/').filter(Boolean);
    if (segments.length < 2)
        return 'SYSTEM_EVENT';
    return `${segments[1].toUpperCase()}_EVENT`;
}
function entityTypeFrom(path) {
    const segments = path.split('/').filter(Boolean);
    if (segments.length < 2)
        return 'SYSTEM';
    const plural = segments[1].toUpperCase();
    if (plural.endsWith('S')) {
        return plural.slice(0, -1);
    }
    return plural;
}
function extractEntityId(req, responseBody) {
    var _a, _b, _c, _d, _e;
    if (typeof ((_a = req.params) === null || _a === void 0 ? void 0 : _a.id) === 'string')
        return req.params.id;
    if (typeof ((_b = req.params) === null || _b === void 0 ? void 0 : _b.accountId) === 'string')
        return req.params.accountId;
    if (typeof ((_c = req.params) === null || _c === void 0 ? void 0 : _c.customerId) === 'string')
        return req.params.customerId;
    if (responseBody === null || responseBody === void 0 ? void 0 : responseBody.id)
        return String(responseBody.id);
    if ((_d = responseBody === null || responseBody === void 0 ? void 0 : responseBody.transaction) === null || _d === void 0 ? void 0 : _d.id)
        return String(responseBody.transaction.id);
    if ((_e = responseBody === null || responseBody === void 0 ? void 0 : responseBody.loan) === null || _e === void 0 ? void 0 : _e.id)
        return String(responseBody.loan.id);
    return undefined;
}
function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip;
}
function requestId(req) {
    const existing = req.headers['x-request-id'];
    if (typeof existing === 'string' && existing.trim().length > 0) {
        return existing.trim();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function auditTrailMiddleware(req, res, next) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
        next();
        return;
    }
    const startedAt = Date.now();
    const reqId = requestId(req);
    let responseBody = null;
    const originalJson = res.json.bind(res);
    res.json = ((body) => {
        responseBody = body;
        return originalJson(body);
    });
    res.on('finish', () => {
        var _a;
        const status = res.statusCode;
        const outcome = status >= 200 && status < 400 ? 'SUCCESS' : 'FAILURE';
        const method = req.method.toUpperCase();
        const route = req.originalUrl || req.path;
        const actor = req.user;
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
        void auditTrail_service_1.auditTrailService.logEvent({
            eventType: eventTypeFrom(route),
            entityType,
            entityId,
            action: actionFrom(method, route),
            outcome,
            actorUserId: (actor === null || actor === void 0 ? void 0 : actor.id) ? String(actor.id) : null,
            actorRole: (actor === null || actor === void 0 ? void 0 : actor.role) ? String(actor.role) : null,
            requestId: reqId,
            method,
            route,
            reference: (responseBody === null || responseBody === void 0 ? void 0 : responseBody.reference) || ((_a = responseBody === null || responseBody === void 0 ? void 0 : responseBody.transaction) === null || _a === void 0 ? void 0 : _a.reference) || null,
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
