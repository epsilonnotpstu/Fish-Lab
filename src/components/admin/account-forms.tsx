"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePasswordAction, updateProfileAction, type FormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function useToast(state: FormState, onSuccess?: () => void) {
  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onSuccess?.();
    }
    if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

export function AccountForms({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [profile, profileAction, profilePending] = useActionState<FormState, FormData>(updateProfileAction, undefined);
  const [pw, pwAction, pwPending] = useActionState<FormState, FormData>(changePasswordAction, undefined);
  useToast(profile, () => router.refresh());
  useToast(pw, () => router.refresh());

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Shown in the admin panel and activity log.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={profileAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={name} required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={profilePending}>{profilePending && <Loader2 className="animate-spin" />} Save profile</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card id="password">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>At least 10 characters with upper-case, lower-case letters and a number.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={pwAction} className="grid gap-4 sm:grid-cols-3" key={pw?.success}>
            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" name="current" type="password" autoComplete="current-password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next">New password</Label>
              <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={pwPending}>{pwPending && <Loader2 className="animate-spin" />} Update password</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
