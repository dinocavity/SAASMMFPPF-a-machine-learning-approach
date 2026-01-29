import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function UserCard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast.info("Logged out");
  };

  if (!user) return null;

  const initials = (user.username || "U")
    .split(/[\s_-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.username}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email || "Signed in"}
            </p>
          </div>
          {user.is_superadmin && (
            <Badge variant="secondary" className="shrink-0">Admin</Badge>
          )}
        </div>
        <Button variant="outline" onClick={handleLogout} className="mt-3 w-full">
          Log out
        </Button>
      </CardContent>
    </Card>
  );
}
