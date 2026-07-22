// frontend/app/admin/audit-log/page.jsx
// Admin Audit Log Page — viewable audit trail of all admin actions
// Displays who did what, when, on which entity, with old and new values
// Supports filtering by action type and entity type with pagination
// Inherits admin layout from app/admin/layout.jsx — no Header/Footer needed
// All labels are config-driven via useConfig()
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import useConfig from '@/hooks/useConfig';
import { apiClient, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/date';

/**
 * Admin Audit Log Page
 * Provides a searchable, filterable view of all administrative actions
 * for accountability and security auditing.
 */
export default function AdminAuditLogPage() {
  const { content } = useConfig();
  const adminContent = content?.admin || {};
  const auditContent = adminContent.auditLog || {};

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Expanded log entry state — tracks which log entries have their details expanded
  const [expandedId, setExpandedId] = useState(null);

  /**
   * Fetches paginated audit logs with optional filters.
   *
   * @param {number} [page=1] - Page number
   */
  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);

      const response = await apiClient.get(`/admin/audit-logs?${params.toString()}`);

      setLogs(response?.data || []);
      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) setError(auditContent.accessError || 'Admin access required.');
        else setError(err.message);
      } else {
        setError(auditContent.loadError || 'Failed to load audit logs.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  function handlePageChange(page) {
    fetchLogs(page);
    setExpandedId(null);
  }

  /**
   * Toggles the expanded state of a log entry to show old/new values.
   *
   * @param {string} logId - The log entry ID
   */
  function toggleExpand(logId) {
    setExpandedId((prev) => (prev === logId ? null : logId));
  }

  /**
   * Returns a human-readable action label.
   *
   * @param {string} action - Raw action code
   * @returns {string} Human-readable label
   */
  function getActionLabel(action) {
    const labels = {
      listing_approved: auditContent.listingApproved || 'Listing Approved',
      listing_rejected: auditContent.listingRejected || 'Listing Rejected',
      user_activated: auditContent.userActivated || 'User Activated',
      user_deactivated: auditContent.userDeactivated || 'User Deactivated',
    };
    return labels[action] || action?.replace(/_/g, ' ') || 'Unknown';
  }

  /**
   * Returns a badge variant for an action type.
   *
   * @param {string} action - Raw action code
   * @returns {string} Badge variant
   */
  function getActionBadge(action) {
    if (action?.includes('approved') || action?.includes('activated')) return 'success';
    if (action?.includes('rejected') || action?.includes('deactivated')) return 'danger';
    return 'info';
  }

  /**
   * Safely parses JSON and returns a formatted string.
   *
   * @param {*} value - Raw JSON value
   * @returns {string} Formatted JSON string or 'N/A'
   */
  function formatJSON(value) {
    if (!value) return 'N/A';
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(value);
    }
  }

  // Filter configurations
  const actionFilters = [
    { value: '', label: auditContent.allActions || 'All Actions' },
    { value: 'listing_approved', label: auditContent.listingApproved || 'Listing Approved' },
    { value: 'listing_rejected', label: auditContent.listingRejected || 'Listing Rejected' },
    { value: 'user_activated', label: auditContent.userActivated || 'User Activated' },
    { value: 'user_deactivated', label: auditContent.userDeactivated || 'User Deactivated' },
  ];

  const entityFilters = [
    { value: '', label: auditContent.allEntities || 'All Entities' },
    { value: 'listing', label: auditContent.listings || 'Listings' },
    { value: 'user', label: auditContent.users || 'Users' },
    { value: 'booking', label: auditContent.bookings || 'Bookings' },
    { value: 'payment', label: auditContent.payments || 'Payments' },
  ];

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
          {auditContent.title || 'Audit Log'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {auditContent.subtitle || 'Track all administrative actions for security and accountability.'}
        </p>
      </div>

      {/* Filter Bar */}
      <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="input input--select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ flex: 1, minWidth: '180px' }}
          >
            {actionFilters.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            className="input input--select"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{ flex: 1, minWidth: '160px' }}
          >
            {entityFilters.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card padding="lg" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error)' }}>{error}</p>
        </Card>
      )}

      {/* Audit Log List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (<Skeleton key={i} type="rect" height="80px" />))}
        </div>
      ) : logs.length === 0 ? (
        <Card padding="lg">
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
            {auditContent.noLogs || 'No audit log entries found matching your criteria.'}
          </p>
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            {logs.map((log) => (
              <Card key={log.id} padding="lg" hoverable>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Action Info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <Badge variant={getActionBadge(log.action)} size="sm">
                        {getActionLabel(log.action)}
                      </Badge>
                      <Badge variant="default" size="sm">
                        {log.entity_type?.charAt(0).toUpperCase() + log.entity_type?.slice(1)}
                      </Badge>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {auditContent.entityId || 'Entity ID'}: <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-xs)' }}>{log.entity_id}</span>
                    </p>
                  </div>

                  {/* Admin Info */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '150px' }}>
                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                      {log.admin_first_name} {log.admin_last_name}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                      {log.admin_email}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>
                      {formatDate(log.created_at, { format: 'datetime' })}
                    </p>
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleExpand(log.id)}
                  style={{
                    marginTop: '0.75rem',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  {expandedId === log.id
                    ? (auditContent.hideDetails || 'Hide Details')
                    : (auditContent.viewDetails || 'View Details')}
                </button>

                {/* Expanded Details — Old vs New Values */}
                {expandedId === log.id && (
                  <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-error-light)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)' }}>
                      <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.5rem', color: 'var(--color-error)' }}>
                        {auditContent.oldValues || 'Old Values'}
                      </p>
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'var(--font-family-mono)' }}>
                        {formatJSON(log.old_values)}
                      </pre>
                    </div>
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-success-light)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)' }}>
                      <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.5rem', color: 'var(--color-success)' }}>
                        {auditContent.newValues || 'New Values'}
                      </p>
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'var(--font-family-mono)' }}>
                        {formatJSON(log.new_values)}
                      </pre>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} showInfo />
          )}
        </>
      )}
    </div>
  );
}