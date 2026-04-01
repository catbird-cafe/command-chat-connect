import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, AlertCircle, Terminal } from "lucide-react";
import { toast } from "sonner";
import { useInstances } from "@/contexts/InstanceContext";
import type { RegisterResult } from "@/lib/datastore";

const Register = () => {
  const { store } = useInstances();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!token.trim()) return;
    if (!store) {
      setError("No backend configured");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await store.register(token.trim());
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Client Registration</CardTitle>
          <CardDescription>Enter your token to get connection credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Registration Token</Label>
            <Input
              placeholder="Paste your token here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={handleRegister} disabled={loading || !token.trim()} className="w-full">
            {loading ? "Registering..." : "Register"}
          </Button>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                Registered successfully
              </div>

              {[
                { label: "Client ID", value: result.client_id },
                { label: "URL", value: result.url },
                { label: "Key", value: result.key },
              ].map((field) => (
                <div key={field.label} className="space-y-1">
                  <span className="text-xs text-muted-foreground">{field.label}</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background p-2 rounded font-mono break-all border">
                      {field.value}
                    </code>
                    <button onClick={() => copy(field.value)} className="text-muted-foreground hover:text-foreground shrink-0">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <p className="text-xs text-muted-foreground mt-2">
                Save these credentials — you'll need them to connect your client.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
