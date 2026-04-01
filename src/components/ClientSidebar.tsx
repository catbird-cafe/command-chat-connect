import { useNavigate } from "react-router-dom";
import { Monitor, Circle, Settings, LogOut, ChevronUp, Book } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ClientInfo } from "@/hooks/useRealtimePresence";

interface ClientSidebarProps {
  clients: ClientInfo[];
  activeClient: string | null;
  onSelectClient: (name: string) => void;
}

export function ClientSidebar({ clients, activeClient, onSelectClient }: ClientSidebarProps) {
  const navigate = useNavigate();
  const hostName = localStorage.getItem("chat-host-name") || "Host";

  const handleLogout = () => {
    localStorage.removeItem("chat-host-name");
    navigate("/");
  };

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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="cursor-pointer">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {hostName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{hostName}</span>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/docs")} className="cursor-pointer">
                  <Book className="h-4 w-4 mr-2" />
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
