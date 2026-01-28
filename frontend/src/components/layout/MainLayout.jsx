import { cn } from "@/lib/utils";

export function MainLayout({ children, className }) {
  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-cyan-50 px-4 py-6 sm:px-5 sm:py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
        {children}
      </div>
    </div>
  );
}

export function ContentGrid({ children, className }) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[1fr_360px]", className)}>
      {children}
    </div>
  );
}

export function MainContent({ children, className }) {
  return <main className={cn("flex flex-col gap-6", className)}>{children}</main>;
}

export function Sidebar({ children, className }) {
  return (
    <aside className={cn("flex flex-col gap-6", className)}>{children}</aside>
  );
}
