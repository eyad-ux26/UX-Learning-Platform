export type NavItem = { id: "home" | "paths" | "profile"; href: string; icon: string; iconOn: string };

export function appItems(pathId: string): NavItem[] {
  return [
    { id: "home", href: "/app", icon: "house", iconOn: "house-fill" },
    { id: "paths", href: `/app/path/${pathId}`, icon: "map", iconOn: "map-fill" },
    { id: "profile", href: "/app/profile", icon: "user", iconOn: "user" },
  ];
}
