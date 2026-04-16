import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/payouts", label: "Payouts" },
  { href: "/new", label: "New Payout" },
];

export function TopNav() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <h1 className="text-lg font-bold text-zinc-900">Global Payout Orchestrator</h1>
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
