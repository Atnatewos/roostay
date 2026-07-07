'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => { console.error('Page error:', error); }, [error]);
  return (
    <div className="error-page">
      <div className="error-page__content">
        <div className="error-page__icon">!</div>
        <h1 className="error-page__title">Something went wrong</h1>
        <p className="error-page__description">{error?.message || 'An unexpected error occurred.'}</p>
        <div className="error-page__actions">
          <button onClick={reset} className="btn btn--primary">Try Again</button>
          <a href="/" className="btn btn--outline">Go Home</a>
        </div>
      </div>
    </div>
  );
}
