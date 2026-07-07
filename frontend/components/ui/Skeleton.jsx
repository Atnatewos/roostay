export default function Skeleton({ type = 'text', width, height, count = 1, className = '', ...props }) {
  if (type === 'card') return (<div className="skeleton skeleton--card" {...props}><div className="skeleton__image" /><div className="skeleton__content"><div className="skeleton__line skeleton__line--title" /><div className="skeleton__line skeleton__line--short" /><div className="skeleton__line skeleton__line--medium" /></div></div>);
  if (type === 'circle') return (<div className={`skeleton skeleton--circle ${className}`} style={{ width: width || '48px', height: height || '48px' }} {...props} />);
  if (type === 'rect') return (<div className={`skeleton skeleton--rect ${className}`} style={{ width: width || '100%', height: height || '100px' }} {...props} />);
  return Array.from({ length: count }).map((_, i) => (<div key={i} className={`skeleton skeleton--line ${className}`} style={{ width: width || (i === count - 1 ? '60%' : '100%'), height: height || '16px' }} {...props} />));
}
