'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';

const CITIES = ['Addis Ababa','Adama','Bahir Dar','Dire Dawa','Gondar','Hawassa','Jimma','Mekelle','Shashamane'];

export default function ListingSearch({ initialValues = {}, onSearch, compact = false }) {
  const [search, setSearch] = useState(initialValues.search || '');
  const [city, setCity] = useState(initialValues.city || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (onSearch) { onSearch({ search, city }); return; }
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    window.location.href = '/search?' + params.toString();
  }

  return (
    <form className={`listing-search ${compact ? 'listing-search--compact' : ''}`} onSubmit={handleSubmit}>
      <div className="listing-search__inputs">
        <div className="listing-search__field">
          <input type="text" className="input listing-search__input" placeholder="Search by name, city, or keyword..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!compact && (
          <div className="listing-search__field">
            <select className="input input--select listing-search__input" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All Cities</option>
              {CITIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        )}
      </div>
      <Button type="submit" variant="primary" size={compact ? 'md' : 'lg'}>Search</Button>
    </form>
  );
}
