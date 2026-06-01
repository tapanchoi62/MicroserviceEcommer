import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign In — EchoShop' };

export default function LoginPage() {
  return (
    <div className="space-y-1.5 mb-6">
      <h2 className="text-xl font-semibold">Welcome back</h2>
      <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
      <div className="pt-4">
        <LoginForm />
      </div>
    </div>
  );
}
