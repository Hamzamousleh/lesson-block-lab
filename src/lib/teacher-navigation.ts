export const TEACHER_NAVIGATION = [
  { kind: "link", label: "Hjem", to: "/home" },
  {
    kind: "group",
    label: "Undervisning",
    items: [
      { to: "/classes", label: "Klasser" },
      { to: "/units", label: "Forløb" },
      { to: "/lessons", label: "Lektioner" },
    ],
  },
  {
    kind: "group",
    label: "Ressourcer",
    items: [
      { to: "/materials", label: "Materialer" },
      { to: "/library", label: "Bibliotek" },
    ],
  },
  {
    kind: "group",
    label: "Live",
    items: [{ to: "/sessions", label: "Sessioner" }],
  },
  { kind: "link", label: "Worlds", to: "/worlds" },
] as const;

export function isNavigationItemActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function isNavigationGroupActive(
  pathname: string,
  items: ReadonlyArray<{ to: string }>,
): boolean {
  return items.some((item) => isNavigationItemActive(pathname, item.to));
}
