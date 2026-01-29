import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.username.trim()) return;

    setLoading(true);

    try {
      await login(formData.username, formData.password);
      setFormData((prev) => ({ ...prev, password: "" }));
      toast.success("Logged in successfully");
    } catch (err) {
      const message = err.response?.data?.detail || "Invalid credentials";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <p className="text-xs text-muted-foreground">
        Sign in to track your analysis history.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, username: e.target.value }))
          }
          placeholder="Enter any username"
          autoComplete="username"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, password: e.target.value }))
          }
          placeholder="Enter any password"
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" loading={loading} disabled={!formData.username.trim()}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
