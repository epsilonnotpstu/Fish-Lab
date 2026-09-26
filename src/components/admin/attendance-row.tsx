"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminCloseAttendance, adminDeleteAttendance } from "@/actions/attendance";
import { initials } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type AttendanceRecord = {
  id: string;
  name: string;
  photo: string;
  group: string;
  checkIn: string;
  checkOut: string | null;
  hours: number | null;
  distance: number | null;
  withinFence: boolean;
  note: string;
  source: string;
};

export function AttendanceRow({ record }: { record: AttendanceRecord }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <tr className="border-b last:border-0 hover:bg-muted/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {record.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={record.photo} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-accent text-[11px] font-bold text-white">
              {initials(record.name)}
            </span>
          )}
          <div>
            <p className="font-medium">{record.name}</p>
            {record.group && <p className="text-xs text-muted-foreground">{record.group}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">{record.checkIn}</td>
      <td className="px-4 py-3">
        {record.checkOut ?? <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">In the lab</Badge>}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{record.hours != null ? `${record.hours} h` : "—"}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {record.distance == null ? (
          "not available"
        ) : record.withinFence ? (
          `${record.distance} m`
        ) : (
          <span className="text-amber-600 dark:text-amber-400">{record.distance} m · outside</span>
        )}
        {record.note && <span className="block text-xs">{record.note}</span>}
      </td>
      <td className="pr-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled={pending} aria-label="Actions"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!record.checkOut && (
              <DropdownMenuItem onSelect={() => run(() => adminCloseAttendance(record.id), "Checked out")}>
                <LogOut /> Mark checked out
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onSelect={() => run(() => adminDeleteAttendance(record.id), "Record deleted")}>
              <Trash2 /> Delete record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
