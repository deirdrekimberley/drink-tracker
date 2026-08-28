"use client";

import { usePathname } from "next/navigation";

const links = [
  { name: "Home", href: "/" },
  { name: "Search", href: "/search" },
  { name: "Scan", href: "/scan" },
  { name: "History", href: "/history" },
  { name: "Stats", href: "/stats" },
  { name: "Groups", href: "/groups" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-md justify-around px-4 py-4 text-sm">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <a
              key={link.href}
              href={link.href}
              className={
                active
                  ? "font-semibold text-gray-900"
                  : "text-gray-500"
              }
            >
              {link.name}
            </a>
          );
        })}
      </div>
    </nav>
  );
}