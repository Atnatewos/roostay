export default function Badge({ children, variant = 'default', size = 'sm', pill = false, className = '', ...props }) {
  const c = ['badge', `badge--${variant}`, `badge--${size}`, pill ? 'badge--pill' : '', className].filter(Boolean).join(' ');
  return (<span className={c} {...props}>{children}</span>);
}
