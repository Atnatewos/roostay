export default function Avatar({ src, alt = 'User avatar', name = '', size = 'md', showStatus = false, status = 'offline', className = '', ...props }) {
  const getInitials = (n) => { if (!n) return '?'; const p = n.trim().split(/\s+/); return p.length === 1 ? p[0].charAt(0).toUpperCase() : (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase(); };
  const c = ['avatar', `avatar--${size}`, className].filter(Boolean).join(' ');
  return (<div className={c} {...props}>{src ? <img className="avatar__image" src={src} alt={alt} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} /> : null}<span className="avatar__initials" style={{ display: src ? 'none' : 'flex' }}>{getInitials(name)}</span>{showStatus && <span className={`avatar__status avatar__status--${status}`} />}</div>);
}
