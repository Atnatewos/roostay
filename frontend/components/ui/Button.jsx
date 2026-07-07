'use client';
import Link from 'next/link';

export default function Button({ variant = 'primary', size = 'md', fullWidth = false, isLoading = false, disabled = false, href, icon, children, className = '', type = 'button', onClick, ...props }) {
  const classNames = ['btn', `btn--${variant}`, `btn--${size}`, fullWidth ? 'btn--full-width' : '', isLoading ? 'btn--loading' : '', className].filter(Boolean).join(' ');
  const content = (<>{isLoading && <span className="btn__spinner" />}{icon && !isLoading && <span className="btn__icon">{icon}</span>}{children && <span className="btn__text">{children}</span>}</>);
  if (href && !disabled && !isLoading) return (<Link href={href} className={classNames} {...props}>{content}</Link>);
  return (<button type={type} className={classNames} disabled={disabled || isLoading} onClick={onClick} {...props}>{content}</button>);
}
