'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import { adminApi, type Member } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 10;

const ROLE_LEVEL: Record<string, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  STAFF: 1,
  CUSTOMER: 0,
};

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'] as const;

/** Tailwind classes for each role pill/badge */
const ROLE_STYLE: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-50  text-red-700  border-red-200',
  ADMIN:       'bg-orange-50 text-orange-700 border-orange-200',
  STAFF:       'bg-blue-50  text-blue-700  border-blue-200',
  CUSTOMER:    'bg-slate-100 text-slate-600 border-slate-200',
};

/** Tailwind classes for selected checkbox pills */
const ROLE_SELECTED: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-600   text-white border-red-600',
  ADMIN:       'bg-orange-500 text-white border-orange-500',
  STAFF:       'bg-blue-600  text-white border-blue-600',
  CUSTOMER:    'bg-slate-600 text-white border-slate-600',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function memberMaxLevel(member: Member): number {
  if (!member.userRoles.length) return -1;
  return Math.max(...member.userRoles.map((ur) => ROLE_LEVEL[ur.role.name] ?? -1));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Avatar({ member }: { member: Member }) {
  const initial = (member.fullName ?? member.email ?? 'U')[0].toUpperCase();
  return member.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={member.avatarUrl}
      alt={member.fullName ?? member.email}
      className="h-10 w-10 rounded-full object-cover ring-2 ring-border flex-shrink-0"
    />
  ) : (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
      {initial}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const { user } = useAuth();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [members, setMembers]     = useState<Member[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput]       = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [roleFilter, setRoleFilter]         = useState('');

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<string[]>([]);
  const [saving, setSaving]         = useState(false);

  // ── Caller info ─────────────────────────────────────────────────────────────
  const isSuperAdmin  = user?.roles.includes('SUPER_ADMIN') ?? false;
  const callerMaxLevel = Math.max(...(user?.roles.map((r) => ROLE_LEVEL[r] ?? -1) ?? [-1]));
  const assignableRoles = isSuperAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => ROLE_LEVEL[r] < callerMaxLevel);

  // ─── Load members ───────────────────────────────────────────────────────────
  const load = useCallback(
    async (pg: number, srch: string, role: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.getMembers({
          page:   pg,
          limit:  LIMIT,
          search: srch || undefined,
          role:   role || undefined,
        });
        setMembers(res.users);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounce search input → committedSearch (resets to page 1)
  useEffect(() => {
    const t = setTimeout(() => {
      setCommittedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reload whenever committed filters or page changes
  useEffect(() => {
    load(page, committedSearch, roleFilter);
  }, [page, committedSearch, roleFilter, load]);

  // Auto-clear success banner after 3 s
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleRoleFilter = (r: string) => {
    setRoleFilter(r);
    setPage(1);
  };

  const handleRefresh = () => load(page, committedSearch, roleFilter);

  const canEdit = (member: Member): boolean => {
    if (!user) return false;
    if (user.id === member.id) return false;          // can't self-edit
    if (isSuperAdmin) return true;                    // SUPER_ADMIN can edit anyone
    return memberMaxLevel(member) < callerMaxLevel;   // ADMIN can only edit lower
  };

  const startEdit = (member: Member) => {
    setEditingId(member.id);
    setPendingRoles(member.userRoles.map((ur) => ur.role.name));
    setSuccess(null);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPendingRoles([]);
  };

  const toggleRole = (role: string) => {
    setPendingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const saveRoles = async (userId: string, memberName: string) => {
    if (pendingRoles.length === 0) {
      setError('Please select at least one role.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminApi.updateMemberRoles(userId, pendingRoles);
      setSuccess(`Roles updated for ${memberName || userId}`);
      setEditingId(null);
      await load(page, committedSearch, roleFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update roles');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Members
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSuperAdmin
              ? 'Manage all users and their roles.'
              : 'Manage STAFF and CUSTOMER accounts. Assign or update their roles.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Success banner */}
      {success && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Error banner */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => handleRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm
                     focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
                     text-foreground min-w-[160px]"
        >
          <option value="">All roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? 'No members found.'
            : `${total} member${total !== 1 ? 's' : ''} — page ${page} of ${totalPages}`}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-25" />
            <p>No members match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const isEditing  = editingId === member.id;
            const editable   = canEdit(member);
            const name       = member.fullName ?? member.email;

            return (
              <Card
                key={member.id}
                className={`overflow-hidden transition-shadow ${isEditing ? 'ring-2 ring-primary/30 shadow-md' : 'hover:shadow-sm'}`}
              >
                {/* ── Member row ───────────────────────────────────────── */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <Avatar member={member} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-medium text-sm truncate">{name}</span>
                      {member.status !== 'active' && (
                        <span className="text-xs text-destructive font-medium capitalize">
                          ({member.status})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {member.userRoles.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No roles</span>
                      ) : (
                        member.userRoles.map(({ role }) => (
                          <span
                            key={role.name}
                            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${ROLE_STYLE[role.name] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                          >
                            {role.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Meta + actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {formatDate(member.createdAt)}
                    </span>
                    {editable ? (
                      <Button
                        size="sm"
                        variant={isEditing ? 'secondary' : 'outline'}
                        className="gap-1.5 text-xs h-7 px-3"
                        onClick={() => (isEditing ? cancelEdit() : startEdit(member))}
                      >
                        {isEditing ? (
                          <><X className="h-3.5 w-3.5" /> Cancel</>
                        ) : (
                          <><Pencil className="h-3.5 w-3.5" /> Edit Roles</>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Protected</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Edit panel (expanded) ────────────────────────────── */}
                {isEditing && (
                  <div className="border-t border-border bg-muted/30 px-5 py-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Assign roles to {name}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {assignableRoles.map((role) => {
                          const selected = pendingRoles.includes(role);
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => toggleRole(role)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium
                                          transition-all cursor-pointer select-none
                                          ${selected
                                  ? ROLE_SELECTED[role] ?? 'bg-primary text-white border-primary'
                                  : `${ROLE_STYLE[role] ?? ''} hover:opacity-80`
                                }`}
                            >
                              {selected ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <span className="h-3 w-3 rounded-full border border-current opacity-50" />
                              )}
                              {role}
                            </button>
                          );
                        })}
                      </div>

                      {pendingRoles.length === 0 && (
                        <p className="mt-2 text-xs text-destructive">
                          At least one role is required.
                        </p>
                      )}
                    </div>

                    {/* Info row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Provider: <strong>{member.provider}</strong></span>
                      <span>Status: <strong className="capitalize">{member.status}</strong></span>
                      <span>Joined: <strong>{formatDate(member.createdAt)}</strong></span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveRoles(member.id, name ?? '')}
                        disabled={saving || pendingRoles.length === 0}
                        loading={saving}
                        className="min-w-[110px]"
                      >
                        {!saving && <Check className="h-3.5 w-3.5" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === '…' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
                ) : (
                  <Button
                    key={item}
                    variant={item === page ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 px-0"
                    onClick={() => setPage(item as number)}
                    disabled={loading}
                  >
                    {item}
                  </Button>
                ),
              )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
