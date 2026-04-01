import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/components/ClientSidebar";
import { ChatView } from "@/components/ChatView";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const hostName = localStorage.getItem("chat-host-name") || "";
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const clients = useRealtimePresence();
  const { messages, sendMessage } = useRealtimeChat(activeClient, hostName);

  useEffect(() => {
    if (!hostName) navigate("/");
  }, [hostName, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("chat-host-name");
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ClientSidebar
          clients={clients}
          activeClient={activeClient}
          onSelectClient={setActiveClient}
        />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium text-muted-foreground">
                Logged in as <span className="text-foreground font-semibold">{hostName}</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </header>
          <ChatView
            clientName={activeClient}
            hostName={hostName}
            messages={messages}
            onSend={sendMessage}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
