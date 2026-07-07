'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import auth from '@/lib/auth';
import constants from '@/lib/constants';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phoneNumber: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await auth.register(form);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__logo"><span className="auth-page__logo-text">ROOSTAY</span></div>
        <h1 className="auth-page__title">Create Account</h1>
        <p className="auth-page__subtitle">Join ROOSTAY to start booking stays in Ethiopia</p>
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <Input id="firstName" label="First Name" value={form.firstName} onChange={handleChange} name="firstName" required />
          <Input id="lastName" label="Last Name" value={form.lastName} onChange={handleChange} name="lastName" required />
          <Input id="email" label="Email" type="email" value={form.email} onChange={handleChange} name="email" required />
          <Input id="phoneNumber" label="Phone (optional)" value={form.phoneNumber} onChange={handleChange} name="phoneNumber" placeholder="0911223344" />
          <Input id="password" label="Password" type="password" value={form.password} onChange={handleChange} name="password" required helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number" />
          {error && <div className="booking-card__error">{error}</div>}
          <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>Create Account</Button>
        </form>
        <p className="auth-page__footer">Already have an account? <Link href={constants.ROUTES.LOGIN}>Sign In</Link></p>
      </div>
    </div>
  );
}
