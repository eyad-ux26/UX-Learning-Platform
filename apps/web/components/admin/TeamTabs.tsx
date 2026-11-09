import { Tabs } from "./ui";

export function TeamTabs({ current, counts }: { current: "members" | "roles" | "super" | "approvals"; counts?: Partial<Record<string, number | string>> }) {
  return (
    <Tabs label="Team and roles" items={[
      { href: "/admin/team", label: "Members", count: counts?.members, current: current === "members" },
      { href: "/admin/team/roles", label: "Roles", count: counts?.roles, current: current === "roles" },
      { href: "/admin/team/super-admins", label: "Super admins", count: counts?.super, current: current === "super" },
      { href: "/admin/team/approvals", label: "Approvals", count: counts?.approvals, current: current === "approvals" },
    ]} />
  );
}
