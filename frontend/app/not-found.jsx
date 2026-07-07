import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-page__content">
        <h1 className="not-found-page__title">404</h1>
        <h2 className="not-found-page__subtitle">Page Not Found</h2>
        <p className="not-found-page__description">The page you are looking for does not exist or has been moved.</p>
        <div className="not-found-page__actions">
          <Link href="/" className="btn btn--primary">Go Home</Link>
          <Link href="/listings" className="btn btn--outline">Browse Listings</Link>
        </div>
      </div>
    </div>
  );
}
