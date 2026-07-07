import Skeleton from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="loading-page">
      <div className="container">
        <div className="loading-page__header"><Skeleton type="rect" width="200px" height="40px" /></div>
        <div className="loading-page__content">
          <Skeleton type="text" width="60%" /><Skeleton type="text" width="40%" />
          <div className="loading-page__cards">
            {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} type="card" />))}
          </div>
        </div>
      </div>
    </div>
  );
}
