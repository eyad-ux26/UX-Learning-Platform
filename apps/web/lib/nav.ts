export type NavItem = { id: "home" | "paths" | "review" | "profile"; href: string; icon: string; iconOn: string };

export function appItems(): NavItem[] {
  return [
    { id: "home", href: "/app", icon: "house", iconOn: "house-fill" },
    { id: "paths", href: "/app/paths", icon: "map", iconOn: "map-fill" },
    { id: "review", href: "/app/review", icon: "review", iconOn: "review-fill" },
    { id: "profile", href: "/app/profile", icon: "user", iconOn: "user" },
  ];
}
