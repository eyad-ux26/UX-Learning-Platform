import { Tabs } from "./ui";

export function SettingsTabs({ current }: { current: "flags" | "rules" | "access" | "legal" }) {
  return <Tabs label="Platform settings" items={[
    { href: "/admin/settings", label: "Feature flags", current: current === "flags" },
    { href: "/admin/settings/rules", label: "Learning rules", current: current === "rules" },
    { href: "/admin/settings/access", label: "Access and maintenance", current: current === "access" },
    { href: "/admin/settings/legal", label: "Legal pages", current: current === "legal" },
  ]} />;
}
