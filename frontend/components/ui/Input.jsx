'use client';
import { useState } from 'react';

export default function Input({ id, label, type = 'text', placeholder, error, helperText, required = false, disabled = false, options = [], className = '', ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const inputClass = ['input', `input--${type}`, error ? 'input--error' : '', disabled ? 'input--disabled' : '', className].filter(Boolean).join(' ');

  const renderInput = () => {
    if (type === 'textarea') return (<textarea id={id} className={inputClass} placeholder={placeholder} required={required} disabled={disabled} rows={4} {...props} />);
    if (type === 'select') return (<select id={id} className={inputClass} required={required} disabled={disabled} {...props}>{placeholder && <option value="">{placeholder}</option>}{options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}</select>);
    return (<div className="input__wrapper"><input id={id} type={type === 'password' ? (showPassword ? 'text' : 'password') : type} className={inputClass} placeholder={placeholder} required={required} disabled={disabled} {...props} />{type === 'password' && (<button type="button" className="input__password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>{showPassword ? 'H' : 'S'}</button>)}</div>);
  };

  return (<div className="form-group">{label && <label htmlFor={id} className="form-group__label">{label}{required && <span className="form-group__required">*</span>}</label>}{renderInput()}{error && <p className="form-group__error">{error}</p>}{helperText && !error && <p className="form-group__helper">{helperText}</p>}</div>);
}
