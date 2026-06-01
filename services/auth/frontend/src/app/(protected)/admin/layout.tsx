'use client';

import { ShieldOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = user?.roles.some((r) => ADMIN_ROLES.includes(r));

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <ShieldOff className="h-14 w-14 opacity-40" />
        <p className="text-xl font-semibold text-foreground">Access Denied</p>
        <p className="text-sm">
          You need <strong>ADMIN</strong> or <strong>SUPER_ADMIN</strong> role to access this area.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
