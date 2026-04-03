import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/components/ClientSidebar";
import { ChatView } from "@/components/ChatView";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { displayName } = useAuth();
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const clients = useRealtimePresence();
  const { messages, sendMessage } = useRealtimeChat(activeClient, displayName);

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
            hostName={displayName}
            messages={messages}
            onSend={sendMessage}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
