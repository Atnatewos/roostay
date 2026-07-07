'use client';
import { useState, useEffect, useCallback } from 'react';

export function Toast({ message, type = 'info', duration = 4000, isVisible = true, onClose }) {
  const [visible, setVisible] = useState(isVisible);
  useEffect(() => { setVisible(isVisible); }, [isVisible]);
  useEffect(() => { if (!visible || !duration) return; const t = setTimeout(() => handleClose(), duration); return () => clearTimeout(t); }, [visible, duration]);
  const handleClose = useCallback(() => { setVisible(false); if (onClose) setTimeout(onClose, 300); }, [onClose]);
  if (!visible) return null;
  const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };
  return (<div className={`toast toast--${type}`} role="alert"><span className="toast__icon">{icons[type] || 'i'}</span><span className="toast__message">{message}</span><button className="toast__close" onClick={handleClose} aria-label="Close">✕</button></div>);
}

export function ToastContainer({ toasts = [], onRemove, position = 'top-right' }) {
  if (!toasts.length) return null;
  return (<div className={`toast-container toast-container--${position}`}>{toasts.map((t) => (<Toast key={t.id} message={t.message} type={t.type} duration={t.duration} onClose={() => onRemove(t.id)} />))}</div>);
}
