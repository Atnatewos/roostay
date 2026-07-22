// frontend/app/admin/users/page.jsx
// Admin Users Page — manage all platform users with search, filter, and actions
// Lists users with role badges, verification status, active/inactive toggle,
// checkbox selection for bulk actions, click-to-view user detail modal,
// and CSV export button for data portability
// Supports search, role filtering, bulk activate/deactivate, and pagination
// Inherits admin layout from app/admin/layout.jsx — no Header/Footer needed
// All labels are config-driven via useConfig()
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import useConfig from '@/hooks/useConfig';
import { apiClient, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { getRoleBadgeVariant } from '@/lib/status';
import constants from '@/lib/constants';

/**
 * Admin Users Management Page
 * Provides a searchable, filterable table of all platform users.
 * Admins can view user details in a modal, toggle account active status,
 * select users for bulk actions, filter by role, and export data as CSV.
 */
export default function AdminUsersPage() {
  const { content } = useConfig();
  const adminContent = content?.admin || {};
  const usersContent = adminContent.users || {};

  // User list state
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Single action state
  const [togglingId, setTogglingId] = useState(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // User detail modal state
  const [detailModal, setDetailModal] = useState({ isOpen: false, user: null, userBookings: [], isLoadingBookings: false });

  /**
   * Fetches paginated and filtered user list from the API.
   *
   * @param {number} [page=1]        - Page number
   * @param {string} [searchTerm='']  - Search query
   * @param {string} [role='']       - Role filter
   */
  const fetchUsers = useCallback(async (page = 1, searchTerm = search, role = roleFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (searchTerm) params.set('search', searchTerm);
      if (role) params.set('role', role);

      const response = await apiClient.get(`/admin/users?${params.toString()}`);

      setUsers(response?.data || response?.users || []);
      if (response?.pagination) {
        setPagination(response.pagination);
      }

      setSelectedIds([]);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) setError('Admin access required.');
        else setError(err.message);
      } else {
        setError(usersContent.loadError || 'Failed to load users.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, usersContent.loadError]);

  useEffect(() => {
    fetchUsers(1, search, roleFilter);
  }, [search, roleFilter, fetchUsers]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchUsers(1, search, roleFilter);
  }

  async function handleToggleStatus(userId, currentStatus) {
    setTogglingId(userId);

    try {
      await apiClient.patch(`/admin/users/${userId}/toggle-status`, {
        isActive: !currentStatus,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: !currentStatus, isActive: !currentStatus } : u
        )
      );
    } catch (err) {
      console.error('Failed to toggle user status:', err.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function openUserDetail(user) {
    setDetailModal({ isOpen: true, user, userBookings: [], isLoadingBookings: true });

    try {
      const endpoint = user.role === 'host' ? '/bookings/host' : '/bookings/guest';
      const response = await apiClient.get(`${endpoint}?limit=5&userId=${user.id}`);

      setDetailModal((prev) => ({
        ...prev,
        userBookings: response?.data || response?.bookings || [],
        isLoadingBookings: false,
      }));
    } catch (err) {
      console.error('Failed to fetch user bookings:', err.message);
      setDetailModal((prev) => ({
        ...prev,
        userBookings: [],
        isLoadingBookings: false,
      }));
    }
  }

  function closeUserDetail() {
    setDetailModal({ isOpen: false, user: null, userBookings: [], isLoadingBookings: false });
  }

  function toggleSelection(userId) {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  }

  async function handleBulkAction(action) {
    if (selectedIds.length === 0) return;

    setIsBulkProcessing(true);

    const isActive = action === 'activate';
    for (const userId of selectedIds) {
      try {
        await apiClient.patch(`/admin/users/${userId}/toggle-status`, { isActive });
      } catch (err) {
        console.error(`Failed to ${action} user ${userId}:`, err.message);
      }
    }

    setIsBulkProcessing(false);
    setSelectedIds([]);
    fetchUsers(pagination.page, search, roleFilter);
  }

  /**
   * Exports the current user list as a CSV file download.
   * Uses the admin export API endpoint with current filters.
   */
  async function handleExportCSV() {
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      const response = await fetch(`/api/admin/export/users?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create a blob from the CSV response and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `roostay-users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export users:', err.message);
    } finally {
      setIsExporting(false);
    }
  }

  function handlePageChange(page) {
    fetchUsers(page, search, roleFilter);
  }

  function getRoleLabel(role) {
    const map = { admin: 'Admin', host: 'Host', guest: 'Guest' };
    return map[role] || role;
  }

  const allSelected = users.length > 0 && selectedIds.length === users.length;

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      {/* Page Header with Export Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
            {usersContent.title || 'Users'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {pagination.totalItems} {pagination.totalItems === 1 ? (usersContent.userSingular || 'user') : (usersContent.userPlural || 'users')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} isLoading={isExporting}>
          {usersContent.exportCSV || 'Export CSV'}
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <Input
              id="search"
              placeholder={usersContent.searchPlaceholder || 'Search by name or email...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input input--select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '140px' }}
          >
            <option value="">{usersContent.allRoles || 'All Roles'}</option>
            <option value="guest">{usersContent.guests || 'Guests'}</option>
            <option value="host">{usersContent.hosts || 'Hosts'}</option>
            <option value="admin">{usersContent.admins || 'Admins'}</option>
          </select>
          <Button type="submit" variant="primary" size="md">
            {usersContent.searchButton || 'Search'}
          </Button>
        </form>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <Card padding="md" style={{ marginBottom: '1rem', backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
              {selectedIds.length} {selectedIds.length === 1 ? (usersContent.userSingular || 'user') : (usersContent.userPlural || 'users')} selected
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="primary" size="sm" onClick={() => handleBulkAction('activate')} isLoading={isBulkProcessing}>
                {usersContent.bulkActivate || 'Activate Selected'}
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleBulkAction('deactivate')} isLoading={isBulkProcessing}>
                {usersContent.bulkDeactivate || 'Deactivate Selected'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                {usersContent.clearSelection || 'Clear'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card padding="lg" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error)' }}>{error}</p>
        </Card>
      )}

      {/* Users Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (<Skeleton key={i} type="rect" height="60px" />))}
        </div>
      ) : users.length === 0 ? (
        <Card padding="lg">
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
            {usersContent.noUsers || 'No users found matching your criteria.'}
          </p>
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 2fr 1.5fr 1fr 1fr 1fr',
                gap: '1rem',
                padding: '0.75rem 1.5rem',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-light)',
                alignItems: 'center',
              }}
            >
              <span>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-primary)' }} aria-label="Select all users" />
              </span>
              <span>{usersContent.colUser || 'User'}</span>
              <span>{usersContent.colEmail || 'Email'}</span>
              <span>{usersContent.colRole || 'Role'}</span>
              <span>{usersContent.colStatus || 'Status'}</span>
              <span>{usersContent.colActions || 'Actions'}</span>
            </div>

            {users.map((user) => (
              <Card key={user.id} padding="md" hoverable>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1.5fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  <span>
                    <input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggleSelection(user.id)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
                  </span>
                  <div>
                    <button onClick={() => openUserDetail(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'var(--color-primary)' }}>
                      <p style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                        {user.firstName || user.first_name} {user.lastName || user.last_name}
                      </p>
                    </button>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                      {usersContent.joined || 'Joined'} {formatDate(user.createdAt || user.created_at)}
                    </p>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email || 'N/A'}</p>
                  <Badge variant={getRoleBadgeVariant(user.role)} size="sm">{getRoleLabel(user.role)}</Badge>
                  <Badge variant={user.isActive || user.is_active ? 'success' : 'default'} size="sm">
                    {user.isActive || user.is_active ? (usersContent.active || 'Active') : (usersContent.inactive || 'Inactive')}
                  </Badge>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="ghost" size="sm" onClick={() => openUserDetail(user)}>{usersContent.viewDetails || 'Details'}</Button>
                    <Button variant="outline" size="sm" onClick={() => handleToggleStatus(user.id, user.isActive || user.is_active)} isLoading={togglingId === user.id}>
                      {user.isActive || user.is_active ? (usersContent.deactivate || 'Deactivate') : (usersContent.activate || 'Activate')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} showInfo />
          )}
        </>
      )}

      {/* User Detail Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={closeUserDetail}
        title={usersContent.userDetailTitle || 'User Details'}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" size="sm" onClick={closeUserDetail}>{usersContent.close || 'Close'}</Button>
            {detailModal.user && (
              <Button
                variant={detailModal.user.isActive || detailModal.user.is_active ? 'danger' : 'primary'}
                size="sm"
                onClick={() => handleToggleStatus(detailModal.user.id, detailModal.user.isActive || detailModal.user.is_active)}
              >
                {detailModal.user.isActive || detailModal.user.is_active ? (usersContent.deactivate || 'Deactivate') : (usersContent.activate || 'Activate')}
              </Button>
            )}
          </div>
        }
      >
        {detailModal.user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)', flexShrink: 0 }}>
                {(detailModal.user.firstName || detailModal.user.first_name)?.charAt(0) || 'U'}
              </div>
              <div>
                <p style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)' }}>
                  {detailModal.user.firstName || detailModal.user.first_name} {detailModal.user.lastName || detailModal.user.last_name}
                </p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{detailModal.user.email}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <Badge variant={getRoleBadgeVariant(detailModal.user.role)} size="sm">{getRoleLabel(detailModal.user.role)}</Badge>
                  <Badge variant={detailModal.user.isActive || detailModal.user.is_active ? 'success' : 'default'} size="sm">
                    {detailModal.user.isActive || detailModal.user.is_active ? (usersContent.active || 'Active') : (usersContent.inactive || 'Inactive')}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.75rem' }}>
                {usersContent.recentBookings || 'Recent Bookings'}
              </h3>
              {detailModal.isLoadingBookings ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[1, 2, 3].map((i) => (<Skeleton key={i} type="rect" height="40px" />))}
                </div>
              ) : detailModal.userBookings.length === 0 ? (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>{usersContent.noBookings || 'No bookings found for this user.'}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {detailModal.userBookings.map((booking) => (
                    <div key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
                      <div>
                        <p style={{ fontWeight: 'var(--font-weight-medium)' }}>{booking.listing_title || 'Property'}</p>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>{formatDate(booking.check_in_date)} — {formatDate(booking.check_out_date)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'default'} size="sm">
                          {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                        </Badge>
                        <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{constants.CURRENCY_SYMBOL} {Number(booking.total_amount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}