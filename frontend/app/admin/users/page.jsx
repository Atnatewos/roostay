// frontend/app/admin/users/page.jsx
// Admin Users Page — manage all platform users with search, filter, and actions
// Lists users with role badges, verification status, and active/inactive toggle
// Supports search, role filtering, and pagination
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import { apiClient, ApiError } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Admin Users Management Page
 * Provides a searchable, filterable table of all platform users.
 * Admins can view user details, toggle account active status,
 * and filter by role and verification state.
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  /**
   * Fetches paginated and filtered user list from the API.
   *
   * @param {number} [page=1] - Page number
   * @param {string} [searchTerm=''] - Search query
   * @param {string} [role=''] - Role filter
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

      // The API might return users differently; handle both formats
      setUsers(response?.data || response?.users || []);
      if (response?.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) setError('Admin access required.');
        else setError(err.message);
      } else {
        setError('Failed to load users.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter]);

  // Fetch users on mount and when filters change
  useEffect(() => {
    fetchUsers(1, search, roleFilter);
  }, [search, roleFilter, fetchUsers]);

  /**
   * Handles search form submission.
   *
   * @param {Event} e - Form submit event
   */
  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchUsers(1, search, roleFilter);
  }

  /**
   * Toggles a user's active status.
   * Sends PATCH request and updates local state optimistically.
   *
   * @param {string} userId - User ID to toggle
   * @param {boolean} currentStatus - Current active status
   */
  async function handleToggleStatus(userId, currentStatus) {
    setTogglingId(userId);

    try {
      await apiClient.patch(`/admin/users/${userId}/toggle-status`, {
        isActive: !currentStatus,
      });

      // Update local state immediately for responsive UX
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

  /**
   * Handles page changes from the Pagination component.
   *
   * @param {number} page - New page number
   */
  function handlePageChange(page) {
    fetchUsers(page, search, roleFilter);
  }

  /**
   * Returns the appropriate badge variant for a user role.
   *
   * @param {string} role - User role
   * @returns {string} Badge variant
   */
  function getRoleBadge(role) {
    const map = { admin: 'danger', host: 'primary', guest: 'info' };
    return map[role] || 'default';
  }

  /**
   * Formats a date for display.
   *
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }}>
            Users
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {pagination.totalItems} registered {pagination.totalItems === 1 ? 'user' : 'users'}
          </p>
        </div>

        {/* Search and Filter Bar */}
        <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <Input
                id="search"
                placeholder="Search by name or email..."
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
              <option value="">All Roles</option>
              <option value="guest">Guests</option>
              <option value="host">Hosts</option>
              <option value="admin">Admins</option>
            </select>
            <Button type="submit" variant="primary" size="md">Search</Button>
          </form>
        </Card>

        {/* Error State */}
        {error && (
          <Card padding="lg" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--color-error)' }}>
            <p style={{ color: 'var(--color-error)' }}>{error}</p>
          </Card>
        )}

        {/* Users Table */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} type="rect" height="60px" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card padding="lg">
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
              No users found matching your criteria.
            </p>
          </Card>
        ) : (
          <>
            {/* Responsive table-like layout using cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
              {/* Table Header — hidden on mobile */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr',
                  gap: '1rem',
                  padding: '0.75rem 1.5rem',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-text-light)',
                }}
              >
                <span>User</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {users.map((user) => (
                <Card key={user.id} padding="md" hoverable>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr',
                      gap: '1rem',
                      alignItems: 'center',
                    }}
                  >
                    {/* User Name and Join Date */}
                    <div>
                      <p style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                        {user.firstName || user.first_name} {user.lastName || user.last_name}
                      </p>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                        Joined {formatDate(user.createdAt || user.created_at)}
                      </p>
                    </div>

                    {/* Email */}
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email || 'N/A'}
                    </p>

                    {/* Role Badge */}
                    <Badge variant={getRoleBadge(user.role)} size="sm">
                      {user.role === 'admin' ? 'Admin' : user.role === 'host' ? 'Host' : 'Guest'}
                    </Badge>

                    {/* Active Status */}
                    <Badge variant={user.isActive || user.is_active ? 'success' : 'default'} size="sm">
                      {user.isActive || user.is_active ? 'Active' : 'Inactive'}
                    </Badge>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(user.id, user.isActive || user.is_active)}
                        isLoading={togglingId === user.id}
                      >
                        {user.isActive || user.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                showInfo
              />
            )}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}