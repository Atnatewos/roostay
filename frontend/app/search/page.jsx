// frontend/app/search/page.jsx
// Search Results Page — displays listings matching search criteria
// Reads query parameters from URL and fetches filtered results from the API
// Supports text search, city filter, and listing type filter
// Author: Theron

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ListingGrid from '@/components/listing/ListingGrid';
import ListingSearch from '@/components/listing/ListingSearch';
import Pagination from '@/components/ui/Pagination';
import useApi from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import constants from '@/lib/constants';

/**
 * Search Results Page
 * Reads search parameters from the URL query string and fetches matching listings.
 * Provides a search bar at the top for refining the search, a results grid,
 * and pagination controls for navigating through multiple pages of results.
 */
export default function SearchPage() {
  // Read search parameters from the URL
  const searchParams = useSearchParams();

  // Extract initial filter values from URL parameters
  const initialSearch = searchParams.get('search') || '';
  const initialCity = searchParams.get('city') || '';
  const initialType = searchParams.get('listingType') || '';

  // State for filters and API results
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    search: initialSearch,
    city: initialCity,
    listingType: initialType,
  });

  const { data, isLoading, execute } = useApi();

  /**
   * Fetches listings from the API based on current filters.
   * Updates the URL to reflect the current search state for shareability.
   *
   * @param {Object} newFilters - Current filter values
   */
  const fetchResults = useCallback((newFilters) => {
    // Update the browser URL without a page reload
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.listingType) params.set('listingType', newFilters.listingType);
    const newUrl = `/search${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);

    // Build API query string
    const apiParams = new URLSearchParams();
    apiParams.set('page', String(newFilters.page || 1));
    apiParams.set('limit', String(newFilters.limit || 12));
    if (newFilters.search) apiParams.set('search', newFilters.search);
    if (newFilters.city) apiParams.set('city', newFilters.city);
    if (newFilters.listingType) apiParams.set('listingType', newFilters.listingType);

    execute(() => apiClient.get(`/listings?${apiParams.toString()}`));
  }, [execute]);

  // Fetch results when filters change
  useEffect(() => {
    fetchResults(filters);
  }, [filters, fetchResults]);

  /**
   * Handles search form submission from the ListingSearch component.
   *
   * @param {Object} searchFilters - Search criteria { search, city, listingType }
   */
  function handleSearch(searchFilters) {
    setFilters((prev) => ({
      ...prev,
      ...searchFilters,
      page: 1, // Reset to first page on new search
    }));
  }

  /**
   * Handles page changes from the Pagination component.
   *
   * @param {number} page - New page number
   */
  function handlePageChange(page) {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const listings = data?.data || [];
  const pagination = data?.pagination || {};
  const totalResults = pagination.totalItems || 0;

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Search Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <ListingSearch
            initialValues={{
              search: filters.search,
              city: filters.city,
              listingType: filters.listingType,
            }}
            onSearch={handleSearch}
          />
        </div>

        {/* Results Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.5rem' }}>
            {filters.search
              ? `Results for "${filters.search}"`
              : filters.city
                ? `Properties in ${filters.city}`
                : 'All Properties'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {isLoading
              ? 'Searching...'
              : `${totalResults} ${totalResults === 1 ? 'property' : 'properties'} found`}
          </p>
        </div>

        {/* Results Grid */}
        <ListingGrid
          listings={listings}
          isLoading={isLoading}
          emptyMessage={
            filters.search || filters.city
              ? 'No properties match your search criteria. Try different keywords or a different city.'
              : 'No properties available at the moment. Check back later!'
          }
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page || 1}
            totalPages={pagination.totalPages || 1}
            onPageChange={handlePageChange}
            showInfo
          />
        )}
      </main>

      <Footer />
    </>
  );
}