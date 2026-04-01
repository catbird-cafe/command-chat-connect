import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/components/ClientSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";
import { Copy, Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseClient, useInstances } from "@/contexts/InstanceContext";

interface TokenRecord {
  id: string;
  token: string;
  label: string | null;
  token_type: string;
  expires_at: string | null;
  used: boolean;
  used_at: string | null;
  client_id: string | null;
  created_at: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const hostName = localStorage.getItem("chat-host-name") || "";
  const clients = useRealtimePresence();
  const supabase = useSupabaseClient();
  const { activeInstance } = useInstances();

  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [tokenType, setTokenType] = useState("one_time");
  const [expiresAt, setExpiresAt] = useState("");
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!hostName) navigate("/");
    else fetchTokens();
  }, [hostName, navigate]);

  const fetchTokens = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("manage-tokens", {
      method: "GET",
    });
    if (Array.isArray(data)) setTokens(data);
    setLoading(false);
  };

  const createToken = async () => {
    setCreating(true);
    const body: Record<string, string> = { token_type: tokenType };
    if (label.trim()) body.label = label.trim();
    if (tokenType === "expiry" && expiresAt) body.expires_at = new Date(expiresAt).toISOString();

    const { data, error } = await supabase.functions.invoke("manage-tokens", {
      method: "POST",
      body,
    });

    if (error) {
      toast.error("Failed to create token");
    } else {
      toast.success("Token created");
      setNewlyCreatedToken(data.token);
      setLabel("");
      setExpiresAt("");
      fetchTokens();
    }
    setCreating(false);
  };

  const deleteToken = async (id: string) => {
    const { error } = await supabase.functions.invoke("manage-tokens", {
      method: "DELETE",
      body: { id },
    });
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Token deleted");
      fetchTokens();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const registerUrl = activeInstance ? `${activeInstance.url}/functions/v1/register` : "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ClientSidebar
          clients={clients}
          activeClient={null}
          onSelectClient={(name) => navigate("/dashboard")}
        />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4 gap-2">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="text-sm font-medium text-muted-foreground">Settings</span>
          </header>

          <div className="flex-1 overflow-auto p-6 max-w-3xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Client Token</CardTitle>
                <CardDescription>
                  Create a registration token that CLI clients use to get their connection credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Label (optional)</Label>
                    <Input
                      placeholder="e.g. Dev laptop"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={tokenType} onValueChange={setTokenType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">One-time use</SelectItem>
                        <SelectItem value="expiry">Expires on date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {tokenType === "expiry" && (
                  <div className="space-y-2">
                    <Label>Expires at</Label>
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                )}
                <Button onClick={createToken} disabled={creating}>
                  <Plus className="h-4 w-4 mr-1" />
                  Generate Token
                </Button>

                {newlyCreatedToken && (
                  <div className="mt-4 p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                    <p className="text-sm font-medium text-primary">New token created — copy it now!</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-sidebar p-2 rounded font-mono break-all text-sidebar-foreground">
                        {newlyCreatedToken}
                      </code>
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(newlyCreatedToken)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      CLI usage: <code className="bg-muted px-1 rounded">curl -X POST {registerUrl} -H "Content-Type: application/json" -d '{`{"token":"${newlyCreatedToken}"}`}'</code>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Tokens</CardTitle>
                <CardDescription>All generated registration tokens</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : tokens.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tokens yet</p>
                ) : (
                  <div className="space-y-3">
                    {tokens.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">
                              {t.label || "Unlabeled"}
                            </span>
                            <Badge variant={t.used ? "secondary" : "default"}>
                              {t.used ? "Used" : "Available"}
                            </Badge>
                            <Badge variant="outline">{t.token_type === "one_time" ? "One-time" : "Expiry"}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {t.token.slice(0, 16)}...
                          </p>
                          {t.client_id && (
                            <p className="text-xs text-muted-foreground">
                              Client ID: <span className="font-mono">{t.client_id}</span>
                            </p>
                          )}
                          {t.expires_at && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {new Date(t.expires_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button size="icon" variant="ghost" onClick={() => copyToClipboard(t.token)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteToken(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registration Endpoint</CardTitle>
                <CardDescription>CLI clients POST their token here to get credentials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all">
                    POST {registerUrl}
                  </code>
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(registerUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
