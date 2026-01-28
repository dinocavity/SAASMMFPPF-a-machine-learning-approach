import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function UserCard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast.info("Logged out");
  };

  if (!user) return null;

  return (
    <div className="grid gap-3 rounded-xl border bg-white p-4 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{user.username}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {user.email || "No email"}
          </p>
        </div>
        {user.is_superadmin && (
          <Badge variant="secondary">Admin</Badge>
        )}
      </div>
      <Button variant="outline" onClick={handleLogout} className="w-full">
        Log out
      </Button>
    </div>
  );
}
