'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ListingGrid from '@/components/listing/ListingGrid';
import ListingSearch from '@/components/listing/ListingSearch';
import ListingFilter from '@/components/listing/ListingFilter';
import Pagination from '@/components/ui/Pagination';
import useApi from '@/hooks/useApi';
import { apiClient } from '@/lib/api';

export default function ListingsPage() {
  const { data, isLoading, execute } = useApi();
  const [filters, setFilters] = useState({ page: 1, limit: 12 });
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    execute(() => apiClient.get(`/listings?${params.toString()}`));
  }, [filters, execute]);

  const listings = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <ListingSearch onSearch={(f) => setFilters({ ...filters, ...f, page: 1 })} />
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ width: '280px', flexShrink: 0 }}>
            <button className="btn btn--outline btn--sm" onClick={() => setShowFilter(!showFilter)} style={{ marginBottom: '1rem', width: '100%' }}>
              {showFilter ? 'Hide Filters' : 'Show Filters'}
            </button>
            {showFilter && (
              <ListingFilter
                filters={filters}
                onFilterChange={(f) => setFilters({ ...f, page: 1 })}
                onApply={() => setShowFilter(false)}
                onReset={() => setFilters({ page: 1, limit: 12 })}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <ListingGrid listings={listings} isLoading={isLoading} />
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page || 1}
                totalPages={pagination.totalPages || 1}
                onPageChange={(p) => setFilters({ ...filters, page: p })}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
