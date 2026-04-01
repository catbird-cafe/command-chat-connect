import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    localStorage.setItem("chat-host-name", name);
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Terminal className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Chat Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your name to start hosting
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            placeholder="Your display name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="h-12 text-base"
          />
          <Button type="submit" className="w-full h-12 text-base font-semibold">
            Enter Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
