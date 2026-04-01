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
import { Copy, Plus, Trash2, ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useInstances } from "@/contexts/InstanceContext";
import type { TokenRecord } from "@/lib/datastore";
import { getAppOrigin, getRegistrationPageUrl } from "@/lib/utils";

const Settings = () => {
  const navigate = useNavigate();
  const hostName = localStorage.getItem("chat-host-name") || "";
  const clients = useRealtimePresence();
  const { activeInstance, store } = useInstances();

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
    if (!store) return;
    setLoading(true);
    try {
      const data = await store.listTokens();
      setTokens(data);
    } catch {
      toast.error("Failed to load tokens");
    }
    setLoading(false);
  };

  const createToken = async () => {
    if (!store) return;
    setCreating(true);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    try {
      await store.createToken({
        token,
        token_type: tokenType,
        label: label.trim() || null,
        expires_at: tokenType === "expiry" && expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      toast.success("Token created");
      setNewlyCreatedToken(token);
      setLabel("");
      setExpiresAt("");
      fetchTokens();
    } catch {
      toast.error("Failed to create token");
    }
    setCreating(false);
  };

  const deleteToken = async (id: string) => {
    if (!store) return;
    try {
      await store.deleteToken(id);
      toast.success("Token deleted");
      fetchTokens();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const registerUrl = getRegistrationPageUrl();
  const appOrigin = getAppOrigin();

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
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Run in a terminal from any folder where you want <code className="bg-muted px-1 rounded">./client</code> created. Copy
                        the block below — your token is already filled in.
                      </p>
                      <div className="relative rounded-md border bg-muted/50">
                        <pre className="text-xs p-3 pr-11 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                          {`curl -fsSL ${appOrigin}/install-cli.sh | bash -s -- ${appOrigin}
cd client
REGISTER_URL="${registerUrl}" node cli-client.js ${newlyCreatedToken}`}
                        </pre>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2 h-8 w-8 shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              `curl -fsSL ${appOrigin}/install-cli.sh | bash -s -- ${appOrigin}
cd client
REGISTER_URL="${registerUrl}" node cli-client.js ${newlyCreatedToken}`,
                            )
                          }
                          title="Copy install + register commands"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Or register in the browser:{" "}
                        <a href={registerUrl} className="text-primary underline break-all">
                          {registerUrl}
                        </a>
                      </p>
                    </div>
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
                <CardTitle>Registration Page</CardTitle>
                <CardDescription>Share this URL with clients to register their tokens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all">
                    {registerUrl}
                  </code>
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(registerUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" asChild>
                    <a href={registerUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
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
