'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import auth from '@/lib/auth';
import constants from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await auth.login(email, password);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__logo"><span className="auth-page__logo-text">ROOSTAY</span></div>
        <h1 className="auth-page__title">Welcome Back</h1>
        <p className="auth-page__subtitle">Sign in to your ROOSTAY account</p>
        <form className="auth-page__form" onSubmit={handleSubmit}>
          <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="booking-card__error">{error}</div>}
          <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>Sign In</Button>
        </form>
        <p className="auth-page__footer">Don't have an account? <Link href={constants.ROUTES.REGISTER}>Sign Up</Link></p>
      </div>
    </div>
  );
}
