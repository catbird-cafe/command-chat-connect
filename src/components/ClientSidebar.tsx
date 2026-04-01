import { Monitor, Circle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { ClientInfo } from "@/hooks/useRealtimePresence";

interface ClientSidebarProps {
  clients: ClientInfo[];
  activeClient: string | null;
  onSelectClient: (name: string) => void;
}

export function ClientSidebar({ clients, activeClient, onSelectClient }: ClientSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span>Clients ({clients.length})</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clients.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-sidebar-foreground/50">
                  No CLI clients online
                </div>
              )}
              {clients.map((client) => (
                <SidebarMenuItem key={client.name}>
                  <SidebarMenuButton
                    onClick={() => onSelectClient(client.name)}
                    isActive={activeClient === client.name}
                    className="cursor-pointer"
                  >
                    <Circle className="h-2 w-2 fill-primary text-primary shrink-0" />
                    <span className="truncate">{client.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
