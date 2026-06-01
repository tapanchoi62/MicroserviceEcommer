'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User, Monitor, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const baseLinks = [
  { href: '/profile',  label: 'Profile',  icon: User,    adminOnly: false },
  { href: '/sessions', label: 'Sessions', icon: Monitor,  adminOnly: false },
  { href: '/admin/members', label: 'Members', icon: Users, adminOnly: true  },
];

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isAdmin = user?.roles.some((r) => ADMIN_ROLES.includes(r)) ?? false;

  const navLinks = baseLinks.filter(
    ({ adminOnly }) => !adminOnly || isAdmin,
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/profile" className="flex items-center gap-2 font-semibold text-foreground">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <span>EchoShop</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon, adminOnly }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                pathname.startsWith(href)
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                adminOnly && 'border border-dashed border-primary/30',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.fullName ?? user.email}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {(user?.fullName ?? user?.email ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <span className="hidden text-sm text-muted-foreground sm:block">
            {user?.fullName ?? user?.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
