'use client';
import { useState } from 'react';

export default function StarRating({ rating = 0, maxStars = 5, interactive = false, onChange, size = 'md', showValue = false }) {
  const [hoverRating, setHoverRating] = useState(0);
  const c = ['star-rating', `star-rating--${size}`, interactive ? 'star-rating--interactive' : ''].filter(Boolean).join(' ');
  return (<div className={c}><div className="star-rating__stars" onMouseLeave={() => interactive && setHoverRating(0)}>{Array.from({ length: maxStars }).map((_, i) => { const v = i + 1; const filled = v <= (hoverRating || rating); return (<span key={i} className={`star-rating__star ${filled ? 'star-rating__star--filled' : 'star-rating__star--empty'}`} onClick={() => interactive && onChange && onChange(v)} onMouseEnter={() => interactive && setHoverRating(v)}>★</span>); })}</div>{showValue && <span className="star-rating__value">{rating > 0 ? rating.toFixed(1) : '—'}</span>}</div>);
}
