import {
  Activity, BookOpen, Briefcase, CalendarDays, FileText, FlaskConical, Handshake, Images, Inbox,
  Layers, LayoutDashboard, Menu, Microscope, Newspaper, Settings, Sparkles, Tags, UserCog, Users, Home,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Activity, BookOpen, Briefcase, CalendarDays, FileText, FlaskConical, Handshake, Images, Inbox,
  Layers, LayoutDashboard, Menu, Microscope, Newspaper, Settings, Sparkles, Tags, UserCog, Users, Home,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name] ?? FileText;
  return <C className={className} />;
}
