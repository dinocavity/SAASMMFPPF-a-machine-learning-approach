import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { UserCard } from "@/components/auth/UserCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export function AccountPage() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-8">
        <h2 className="font-heading text-xl font-semibold">Your Account</h2>
        <div className="w-full">
          <UserCard />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-8">
      <LockIcon />
      <div className="text-center">
        <h2 className="font-heading text-xl font-semibold">Sign In</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to track your analysis history
        </p>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Welcome</CardTitle>
          <CardDescription>Use any username and password to sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
