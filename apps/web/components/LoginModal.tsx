"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";

type User = { id: string; name: string; email: string };

interface LoginModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    const url = mode === "login" ? "/api/adapters/auth/login" : "/api/adapters/auth/register";
    const body = mode === "login" ? { email, password } : { name, email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const fields = data.details?.fieldErrors as Record<string, string[]> | undefined;
        if (fields) {
          setFieldErrors(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v[0] ?? "Invalid"])));
        } else {
          setError(data.error ?? "Something went wrong");
        }
      } else {
        onSuccess(data.user);
        onClose();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border border-border rounded-xl w-full max-w-sm p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">{mode === "login" ? "Login" : "Register"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <div className="flex flex-col gap-1">
              <input
                className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {fieldErrors.name && <p className="text-destructive text-xs">{fieldErrors.name}</p>}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <input
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {fieldErrors.email && <p className="text-destructive text-xs">{fieldErrors.email}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <input
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {fieldErrors.password && <p className="text-destructive text-xs">{fieldErrors.password}</p>}
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "..." : mode === "login" ? "Login" : "Create account"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          {mode === "login" ? (
            <>No account?{" "}<button className="underline" onClick={() => setMode("register")}>Register</button></>
          ) : (
            <>Have an account?{" "}<button className="underline" onClick={() => setMode("login")}>Login</button></>
          )}
        </p>
      </div>
    </div>
  );
}
