"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Link2, Loader2, LogOut, MoreHorizontal, Plus, Search, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { createUser, deleteUser, resetUserPassword, revokeSessions, updateUser } from "@/actions/users";
import { formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "./confirm-dialog";

type Role = "SUPER_ADMIN" | "EDITOR" | "MEMBER";
type UserRow = {
  id: string; name: string; email: string; role: Role; active: boolean; lastLoginAt: string | null;
  locked: boolean; hasPassword: boolean; memberId: string | null; memberName: string | null; sessions: number;
};

const ROLE_LABEL: Record<Role, string> = { SUPER_ADMIN: "Super admin", EDITOR: "Editor", MEMBER: "Member" };
const ROLE_STYLE: Record<Role, string> = {
  SUPER_ADMIN: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  EDITOR: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  MEMBER: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};
const NONE = "__none__";

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = crypto.getRandomValues(new Uint32Array(14));
  const p = Array.from(arr, (n) => chars[n % chars.length]).join("");
  return `${p.slice(0, 5)}-${p.slice(5, 10)}-${p.slice(10)}A7`;
}

export function UsersManager({ users, members, meId }: { users: UserRow[]; members: { id: string; name: string }[]; meId: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "staff" | "members">("all");
  const [edit, setEdit] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (tab === "all" || (tab === "members" ? u.role === "MEMBER" : u.role !== "MEMBER")) &&
          `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [users, q, tab],
  );

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        after?.();
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(["all", "staff", "members"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium capitalize transition", tab === t ? "bg-background shadow-sm" : "text-muted-foreground")}>
                {t} <span className="text-xs text-muted-foreground">{t === "all" ? users.length : users.filter((u) => (t === "members") === (u.role === "MEMBER")).length}</span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="h-9 pl-9" />
          </div>
          <div className="flex-1" />
          <Button onClick={() => setCreating(true)}><Plus /> Add admin / editor</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Linked profile</th>
                <th className="px-4 py-2.5 font-medium">Last sign-in</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-accent text-xs font-bold text-white">{initials(u.name)}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.name} {u.id === meId && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", ROLE_STYLE[u.role])}>{ROLE_LABEL[u.role]}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{u.memberName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt, "MMM d, yyyy HH:mm") : "Never"}</td>
                  <td className="px-4 py-3">
                    {!u.active ? <Badge variant="secondary">Disabled</Badge> : u.locked ? <Badge variant="destructive">Locked</Badge> : <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">Active</Badge>}
                  </td>
                  <td className="pr-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEdit(u)}><UserCog /> Edit role & profile link</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setResetFor(u)}><KeyRound /> {u.hasPassword ? "Reset password" : "Set password"}</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => run(() => revokeSessions(u.id), "Signed out everywhere")}><LogOut /> Sign out everywhere ({u.sessions})</DropdownMenuItem>
                        {u.id !== meId && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(u)}><Trash2 /> Delete user</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditDialog key={edit?.id} user={edit} members={members} pending={pending} onClose={() => setEdit(null)}
        onSave={(v) => run(() => updateUser(v), "User updated", () => setEdit(null))} />
      <CreateDialog open={creating} pending={pending} onClose={() => setCreating(false)}
        onSave={(v) => run(() => createUser(v), "User created — they must change the password on first sign-in", () => setCreating(false))} />
      <ResetDialog key={resetFor?.id} user={resetFor} pending={pending} onClose={() => setResetFor(null)}
        onSave={(password) => run(() => resetUserPassword({ id: resetFor!.id, password }), "Password set. Share it securely; it must be changed on next sign-in.", () => setResetFor(null))} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="The account and all its sessions are removed. Linked member profiles are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const res = await deleteUser(deleting!.id);
          if (res.ok) { toast.success("User deleted"); router.refresh(); } else toast.error(res.error);
          setDeleting(null);
        }}
      />
    </>
  );
}

function EditDialog({ user, members, pending, onClose, onSave }: {
  user: UserRow | null; members: { id: string; name: string }[]; pending: boolean; onClose: () => void;
  onSave: (v: { id: string; role: Role; active: boolean; memberId: string | null }) => void;
}) {
  const [role, setRole] = useState<Role>(user?.role ?? "MEMBER");
  const [active, setActive] = useState(user?.active ?? true);
  const [memberId, setMemberId] = useState<string>(user?.memberId ?? NONE);
  return (
    <Dialog open={Boolean(user)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user?.name}</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member — edits own profile only</SelectItem>
                <SelectItem value="EDITOR">Editor — manages website content</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super admin — full access</SelectItem>
              </SelectContent>
            </Select>
            {role !== "MEMBER" && user && !user.hasPassword && (
              <p className="text-xs text-amber-600">Staff sign in with a password. Use “Set password” first.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Link2 className="size-3.5" /> Linked member profile</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Not linked —</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">The linked profile is what a member can edit in the member portal.</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Account active</p>
              <p className="text-xs text-muted-foreground">Disabled accounts cannot sign in.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={() => user && onSave({ id: user.id, role, active, memberId: memberId === NONE ? null : memberId })}>
            {pending && <Loader2 className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" autoComplete="new-password" />
      <Button type="button" variant="outline" onClick={() => onChange(genPassword())}>Generate</Button>
    </div>
  );
}

function CreateDialog({ open, pending, onClose, onSave }: {
  open: boolean; pending: boolean; onClose: () => void;
  onSave: (v: { name: string; email: string; role: "SUPER_ADMIN" | "EDITOR"; password: string }) => void;
}) {
  const [v, setV] = useState({ name: "", email: "", role: "EDITOR" as "SUPER_ADMIN" | "EDITOR", password: genPassword() });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-5" /> Add admin or editor</DialogTitle>
          <DialogDescription>Members create their own accounts from the member portal. Staff accounts are created here with a temporary password.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2"><Label>Name</Label><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={v.role} onValueChange={(r) => setV({ ...v, role: r as "SUPER_ADMIN" | "EDITOR" })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EDITOR">Editor</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Temporary password</Label><PasswordInput value={v.password} onChange={(password) => setV({ ...v, password })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={() => onSave(v)}>{pending && <Loader2 className="animate-spin" />} Create user</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ user, pending, onClose, onSave }: { user: UserRow | null; pending: boolean; onClose: () => void; onSave: (p: string) => void }) {
  const [password, setPassword] = useState(genPassword());
  return (
    <Dialog open={Boolean(user)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user?.hasPassword ? "Reset" : "Set"} password for {user?.name}</DialogTitle>
          <DialogDescription>They will be signed out everywhere and must choose a new password at next sign-in.</DialogDescription>
        </DialogHeader>
        <PasswordInput value={password} onChange={setPassword} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={() => onSave(password)}>{pending && <Loader2 className="animate-spin" />} Save password</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
