'use client';

import { useEffect, useState } from 'react';
import {
  Mail, User, ShieldCheck, CheckCircle2, XCircle,
  Clock, Loader2, AlertCircle,
} from 'lucide-react';
import { authApi, type UserProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SUPER_ADMIN: 'destructive',
  ADMIN: 'destructive',
  STAFF: 'secondary',
  CUSTOMER: 'default',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authApi
      .getProfile()
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Your account information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar card */}
        <Card className="md:col-span-1 flex flex-col items-center p-6 gap-4">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={profile?.fullName ?? ''}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-border"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
              {(profile?.fullName ?? profile?.email ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <p className="font-semibold text-lg">{profile?.fullName ?? '—'}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {profile?.userRoles.map(({ role }) => (
              <Badge key={role.name} variant={ROLE_COLORS[role.name] ?? 'outline'}>
                {role.name}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Details card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Personal information and security status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={profile?.fullName ?? '—'} />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile?.email ?? '—'} />
            <InfoRow
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Email Verified"
              value={
                profile?.isEmailVerified ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600">
                    <XCircle className="h-4 w-4" /> Not verified
                  </span>
                )
              }
            />
            <InfoRow
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Two-Factor Auth"
              value={
                profile?.isMfaEnabled ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" /> Enabled
                  </span>
                ) : (
                  <span className="text-muted-foreground">Disabled</span>
                )
              }
            />
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label="Member Since"
              value={profile?.createdAt ? formatDate(profile.createdAt) : '—'}
            />
            <InfoRow
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Account Status"
              value={
                <span className={`capitalize font-medium ${profile?.status === 'active' ? 'text-green-600' : 'text-destructive'}`}>
                  {profile?.status}
                </span>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground text-sm min-w-[140px]">
        {icon}
        {label}
      </div>
      <div className="text-sm text-right">{value}</div>
    </div>
  );
}
