import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Eye, RefreshCw } from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { auditApi, handleApiError } from '../lib/api';
import { formatDateTime } from '../lib/utils';

interface AuditEvent {
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
  createdAt: string;
}

const ACTION_VERBS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  REVERSE: 'Reversed',
  STATUS_CHANGE: 'Changed status of',
};

const friendlyAction = (action: string): string =>
  ACTION_VERBS[action] || (action.charAt(0) + action.slice(1).toLowerCase());

const friendlyEntity = (entityType: string): string =>
  entityType
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');

const actorLabel = (event: AuditEvent): string => event.actorName || event.actorUsername || 'System';

const summarize = (event: AuditEvent): string =>
  `${friendlyAction(event.action)} ${friendlyEntity(event.entityType)}`;

interface AuditResponse {
  events: AuditEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const stringifyJson = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const Audit: React.FC = () => {
  // Lets other pages (e.g. Account Detail's "View Audit Trail" button) deep-link straight into
  // a pre-filtered view instead of dumping the user on an empty, unfiltered audit log.
  const [searchParams] = useSearchParams();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [outcome, setOutcome] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = (await auditApi.getEvents({
        page,
        limit,
        search: search.trim(),
        outcome,
        action,
        entityType,
        actorRole,
        dateFrom,
        dateTo,
      })) as AuditResponse;

      setEvents(response.events || []);
      setTotalPages(response.pagination?.totalPages || 0);
      setTotalItems(response.pagination?.total || 0);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, outcome, action, entityType, actorRole, dateFrom, dateTo]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleApplyFilters = () => {
    setPage(1);
    void fetchEvents();
  };

  const handleResetFilters = () => {
    setSearch('');
    setOutcome('');
    setAction('');
    setEntityType('');
    setActorRole('');
    setDateFrom('');
    setDateTo('');
    setLimit(20);
    setPage(1);

    // Force reload with default filters so reset works even if values were already at defaults.
    void (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = (await auditApi.getEvents({
          page: 1,
          limit: 20,
          search: '',
          outcome: '',
          action: '',
          entityType: '',
          actorRole: '',
          dateFrom: '',
          dateTo: '',
        })) as AuditResponse;

        setEvents(response.events || []);
        setTotalPages(response.pagination?.totalPages || 0);
        setTotalItems(response.pagination?.total || 0);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const openDetails = async (id: string) => {
    try {
      const response = await auditApi.getEventById(id);
      setSelectedEvent(response.event as AuditEvent);
      setIsDetailOpen(true);
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const outcomeVariant = (value: string): 'success' | 'danger' | 'warning' => {
    if (value === 'SUCCESS') return 'success';
    if (value === 'FAILURE') return 'danger';
    return 'warning';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search request/reference/route"
                className="pl-9"
              />
            </div>
            <Select
              value={outcome}
              onChange={(value) => setOutcome(value)}
              options={[
                { value: 'SUCCESS', label: 'Success' },
                { value: 'FAILURE', label: 'Failure' },
              ]}
            />
            <Select
              value={action}
              onChange={(value) => setAction(value)}
              options={[
                { value: 'CREATE', label: 'Create' },
                { value: 'UPDATE', label: 'Update' },
                { value: 'DELETE', label: 'Delete' },
                { value: 'APPROVE', label: 'Approve' },
                { value: 'REJECT', label: 'Reject' },
                { value: 'REVERSE', label: 'Reverse' },
                { value: 'STATUS_CHANGE', label: 'Status Change' },
              ]}
            />
            <Input
              value={entityType}
              onChange={(e) => setEntityType(e.target.value.toUpperCase())}
              placeholder="Entity type (e.g. ACCOUNT)"
            />
            <Input
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value.toUpperCase())}
              placeholder="Actor role (e.g. ADMIN)"
            />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select
              value={String(limit)}
              onChange={(value) => {
                setLimit(Number.parseInt(value, 10));
                setPage(1);
              }}
              options={[
                { value: '20', label: '20 per page' },
                { value: '50', label: '50 per page' },
                { value: '100', label: '100 per page' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
            <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            <Button variant="ghost" onClick={() => void fetchEvents()}>
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events ({totalItems})</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>What happened</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>Loading audit events...</TableCell>
                  </TableRow>
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No audit events found.</TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(event.createdAt)}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900 dark:text-dark-text">{actorLabel(event)}</div>
                        {event.actorRole && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{event.actorRole}</div>
                        )}
                      </TableCell>
                      <TableCell>{summarize(event)}</TableCell>
                      <TableCell>
                        <Badge variant={outcomeVariant(event.outcome)}>{event.outcome}</Badge>
                      </TableCell>
                      <TableCell>{event.reference || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => void openDetails(event.id)}>
                          <Eye size={16} className="mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-300">
            <span>Page {page} of {Math.max(totalPages, 1)}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => (totalPages > 0 ? Math.min(totalPages, p + 1) : p + 1))}
                disabled={(totalPages > 0 && page >= totalPages) || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Audit Event Details"
        size="2xl"
      >
        {selectedEvent ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-gray-800 p-3">
              <p className="text-base text-gray-900 dark:text-dark-text">
                <strong>{actorLabel(selectedEvent)}</strong>
                {selectedEvent.actorRole ? ` (${selectedEvent.actorRole})` : ''} {summarize(selectedEvent).toLowerCase()}
                {selectedEvent.reference ? ` — ref ${selectedEvent.reference}` : ''}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDateTime(selectedEvent.createdAt)} · Outcome:{' '}
                <Badge variant={outcomeVariant(selectedEvent.outcome)}>{selectedEvent.outcome}</Badge>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><strong>ID:</strong> {selectedEvent.id}</div>
              <div><strong>Entity:</strong> {selectedEvent.entityType} / {selectedEvent.entityId || '-'}</div>
              <div><strong>Action:</strong> {selectedEvent.action}</div>
              <div><strong>Event Type:</strong> {selectedEvent.eventType}</div>
              <div><strong>Method / Route:</strong> {selectedEvent.method || '-'} {selectedEvent.route || ''}</div>
              <div><strong>Request ID:</strong> {selectedEvent.requestId || '-'}</div>
              <div><strong>Actor User ID:</strong> {selectedEvent.actorUserId || '-'}</div>
              <div><strong>IP:</strong> {selectedEvent.ipAddress || '-'}</div>
            </div>

            <div>
              <p className="font-semibold mb-1">Hash Chain</p>
              <pre className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
{`prevHash: ${selectedEvent.prevHash || 'null'}
eventHash: ${selectedEvent.eventHash}`}
              </pre>
            </div>

            <div>
              <p className="font-semibold mb-1">Before Data</p>
              <pre className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {stringifyJson(selectedEvent.beforeData)}
              </pre>
            </div>

            <div>
              <p className="font-semibold mb-1">After Data</p>
              <pre className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {stringifyJson(selectedEvent.afterData)}
              </pre>
            </div>

            <div>
              <p className="font-semibold mb-1">Metadata</p>
              <pre className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {stringifyJson(selectedEvent.metadata)}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Audit;