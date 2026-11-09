import { Tabs, type Tone } from "./ui";

export const RELEASE_STATUS: Record<string, [Tone, string, string]> = {
  in_review: ["wait", "eye", "In review"], published: ["good", "check-circle-fill", "Published"], declined: ["bad", "arrow-u-up-left", "Sent back"],
  withdrawn: ["off", "minus-circle", "Withdrawn"], rolled_back: ["off", "arrow-counter-clockwise", "Rolled back"],
};

export function ContentTabs({ current }: { current: "paths" | "skills" | "quality" | "releases" }) {
  return <Tabs label="Content" items={[
    { href: "/admin/content", label: "Paths and lessons", current: current === "paths" },
    { href: "/admin/content/skills", label: "Skills and misconceptions", current: current === "skills" },
    { href: "/admin/content/quality", label: "Quality", current: current === "quality" },
    { href: "/admin/content/releases", label: "Releases", current: current === "releases" },
  ]} />;
}

export const QUALITY_STATUS: Record<string, [Tone, string, string]> = {
  to_check: ["wait", "flag", "To check"], fixing: ["info", "pencil-simple", "Fixing"], fixed: ["good", "check-circle-fill", "Fixed"], wont_fix: ["off", "minus-circle", "Won't fix"],
};
