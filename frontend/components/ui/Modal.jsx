'use client';
import { useEffect, useRef, useCallback } from 'react';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', closeOnOverlay = true }) {
  const modalRef = useRef(null);
  const prevEl = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab' && modalRef.current) {
      const els = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) { prevEl.current = document.activeElement; document.body.style.overflow = 'hidden'; document.addEventListener('keydown', handleKeyDown); setTimeout(() => modalRef.current?.focus(), 100); }
    else { document.body.style.overflow = ''; document.removeEventListener('keydown', handleKeyDown); prevEl.current?.focus(); }
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;
  return (<div className="modal__overlay" onClick={closeOnOverlay ? onClose : undefined}><div ref={modalRef} className={`modal modal--${size}`} role="dialog" aria-modal="true" tabIndex={-1} onClick={(e) => e.stopPropagation()}><div className="modal__header">{title && <h2 className="modal__title">{title}</h2>}<button className="modal__close" onClick={onClose} aria-label="Close">X</button></div><div className="modal__body">{children}</div>{footer && <div className="modal__footer">{footer}</div>}</div></div>);
}
