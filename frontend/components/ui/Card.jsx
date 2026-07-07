export default function Card({ children, padding = 'md', hoverable = false, clickable = false, onClick, className = '', ...props }) {
  const c = ['card', `card--padding-${padding}`, hoverable ? 'card--hoverable' : '', clickable ? 'card--clickable' : '', className].filter(Boolean).join(' ');
  return (<div className={c} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(e); } : undefined} {...props}>{children}</div>);
}
