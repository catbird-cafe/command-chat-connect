import { Link, useNavigate } from "react-router-dom";
import { Monitor, Circle, Settings, LogOut, ChevronUp, Book, Server } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
import { useInstances } from "@/contexts/InstanceContext";
import type { ClientInfo } from "@/hooks/useRealtimePresence";

interface ClientSidebarProps {
  clients: ClientInfo[];
  activeClient: string | null;
  onSelectClient: (name: string) => void;
}

export function ClientSidebar({ clients, activeClient, onSelectClient }: ClientSidebarProps) {
  const navigate = useNavigate();
  const hostName = localStorage.getItem("chat-host-name") || "Host";
  const { activeInstance } = useInstances();

  const handleLogout = () => {
    localStorage.removeItem("chat-host-name");
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {activeInstance && (
          <div className="px-3 py-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
              <Server className="h-3 w-3" />
              <span className="truncate">{activeInstance.name}</span>
            </div>
          </div>
        )}
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
                <DropdownMenuItem onClick={() => navigate("/instances")} className="cursor-pointer">
                  <Server className="h-4 w-4 mr-2" />
                  Instances
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/docs" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center">
                    <Book className="h-4 w-4 mr-2" />
                    Documentation
                  </Link>
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
