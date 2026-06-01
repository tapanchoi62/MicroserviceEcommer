import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = { title: 'Create Account — EchoShop' };

export default function RegisterPage() {
  return (
    <div className="space-y-1.5 mb-6">
      <h2 className="text-xl font-semibold">Create an account</h2>
      <p className="text-sm text-muted-foreground">Start shopping with EchoShop today</p>
      <div className="pt-4">
        <RegisterForm />
      </div>
    </div>
  );
}
