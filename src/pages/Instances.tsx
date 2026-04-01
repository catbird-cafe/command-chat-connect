import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInstances, type SupabaseInstance } from "@/contexts/InstanceContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/components/ClientSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, Server } from "lucide-react";
import { toast } from "sonner";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";

const Instances = () => {
  const navigate = useNavigate();
  const hostName = localStorage.getItem("chat-host-name") || "";
  const clients = useRealtimePresence();
  const { instances, activeInstance, addInstance, updateInstance, removeInstance, setActiveInstanceId } = useInstances();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", anonKey: "" });

  const resetForm = () => {
    setForm({ name: "", url: "", anonKey: "" });
    setShowAdd(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!form.name.trim() || !form.url.trim() || !form.anonKey.trim()) {
      toast.error("All fields are required");
      return;
    }
    addInstance({ name: form.name.trim(), url: form.url.trim(), anonKey: form.anonKey.trim() });
    toast.success("Instance added");
    resetForm();
  };

  const handleUpdate = (id: string) => {
    if (!form.name.trim() || !form.url.trim() || !form.anonKey.trim()) {
      toast.error("All fields are required");
      return;
    }
    updateInstance(id, { name: form.name.trim(), url: form.url.trim(), anonKey: form.anonKey.trim() });
    toast.success("Instance updated");
    resetForm();
  };

  const handleDelete = (id: string) => {
    removeInstance(id);
    toast.success("Instance removed");
  };

  const startEdit = (inst: SupabaseInstance) => {
    setEditingId(inst.id);
    setForm({ name: inst.name, url: inst.url, anonKey: inst.anonKey });
    setShowAdd(false);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ClientSidebar
          clients={clients}
          activeClient={null}
          onSelectClient={() => navigate("/dashboard")}
        />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4 gap-2">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="text-sm font-medium text-muted-foreground">Instances</span>
          </header>

          <div className="flex-1 overflow-auto p-6 max-w-3xl space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Backend Instances</CardTitle>
                  <CardDescription>Manage your Supabase connections. The active instance is used for all realtime features.</CardDescription>
                </div>
                {!showAdd && (
                  <Button size="sm" onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: "", url: "", anonKey: "" }); }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {showAdd && (
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">New Instance</h3>
                    <div className="grid gap-3 sm:grid-cols-1">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input placeholder="e.g. Production" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Supabase URL</Label>
                        <Input placeholder="https://xxxxx.supabase.co" value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Anon Key</Label>
                        <Input placeholder="eyJ..." value={form.anonKey} onChange={(e) => setForm(f => ({ ...f, anonKey: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAdd}>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={resetForm}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {instances.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No instances configured</p>
                ) : (
                  <div className="space-y-3">
                    {instances.map((inst) => (
                      <div key={inst.id}>
                        {editingId === inst.id ? (
                          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">Edit Instance</h3>
                            <div className="grid gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Supabase URL</Label>
                                <Input value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Anon Key</Label>
                                <Input value={form.anonKey} onChange={(e) => setForm(f => ({ ...f, anonKey: e.target.value }))} />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdate(inst.id)}>
                                <Check className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={resetForm}>
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className={`flex items-center justify-between p-3 rounded-lg border ${activeInstance?.id === inst.id ? 'border-primary/50 bg-primary/5' : 'bg-card'}`}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">{inst.name}</span>
                                  {activeInstance?.id === inst.id && (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0">Active</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground font-mono truncate">{inst.url}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {activeInstance?.id !== inst.id && (
                                <Button size="sm" variant="outline" onClick={() => { setActiveInstanceId(inst.id); toast.success(`Switched to ${inst.name}`); }}>
                                  Activate
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => startEdit(inst)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(inst.id)} disabled={instances.length === 1}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Instances;
