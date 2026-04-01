import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/components/ClientSidebar";
import { ChatView } from "@/components/ChatView";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";

const Dashboard = () => {
  const navigate = useNavigate();
  const hostName = localStorage.getItem("chat-host-name") || "";
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const clients = useRealtimePresence();
  const { messages, sendMessage } = useRealtimeChat(activeClient, hostName);

  useEffect(() => {
    if (!hostName) navigate("/");
  }, [hostName, navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ClientSidebar
          clients={clients}
          activeClient={activeClient}
          onSelectClient={setActiveClient}
        />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
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
