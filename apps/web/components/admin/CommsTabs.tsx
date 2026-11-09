import { Tabs, type Tone } from "./ui";

export const COMMS_STATUS: Record<string, [Tone, string, string]> = {
  draft: ["info", "pencil-simple", "Draft"], waiting_approval: ["wait", "scales", "Waiting for approval"], scheduled: ["good", "clock-counter-clockwise", "Scheduled"],
  sending: ["wait", "paper-plane-tilt", "Sending"], sent: ["good", "check-circle-fill", "Sent"], cancelled: ["off", "minus-circle", "Stopped"],
};

export function CommsTabs({ current }: { current: "announcements" | "campaigns" | "templates" | "waitlist" | "log" }) {
  return <Tabs label="Communications" items={[
    { href: "/admin/communications", label: "Announcements", current: current === "announcements" },
    { href: "/admin/communications/campaigns", label: "Email campaigns", current: current === "campaigns" },
    { href: "/admin/communications/templates", label: "Email templates", current: current === "templates" },
    { href: "/admin/communications/waitlist", label: "Launch list", current: current === "waitlist" },
    { href: "/admin/communications/log", label: "Email log", current: current === "log" },
  ]} />;
}

/** yyyy-mm-ddThh:mm in Cairo time, for datetime-local inputs. */
export function cairoLocal(at: string | number | Date): string {
  const d = new Date(new Date(at).getTime() + 2 * 3_600_000);
  return d.toISOString().slice(0, 16);
}
