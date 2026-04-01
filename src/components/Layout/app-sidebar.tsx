import * as React from "react";
import { useMemo } from "react";
import {
  Home,
  UserSearch,
  FileText,
  Handshake,
  Calendar,
  ShieldCheck,
} from "lucide-react";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import { User } from "@/types";

import type { ModuleType } from "@/App";
import { Header } from "./Header";

type Team = {
  team: {
    name: string;
    logo: React.ElementType;
    plan: string;
    module: ModuleType;
  };
  navMain: {
    title: string;
    module: ModuleType;
    icon: any;
  }[];
};

const data: Team = {
  team: {
    name: "AXEL",
    logo: () => <img src="/mote.png" alt="logo mote" />,
    plan: "Allocation · eXpenses · Engagements · Leaves",
    module: "dashboard",
  },
  navMain: [
    {
      title: "Dashboard",
      module: "dashboard",
      icon: Home,
    },
    {
      title: "Allocations",
      module: "allocations",
      icon: UserSearch,
    },
    {
      title: "eXpenses",
      module: "expenses",
      icon: FileText,
    },
    {
      title: "Controlo de Acessos",
      module: "doorlogs",
      icon: ShieldCheck,
    },
    {
      title: "Engagements",
      module: "engagements",
      icon: Handshake,
    },
    {
      title: "Leaves",
      module: "leaves",
      icon: Calendar,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User;
  currentModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
}

export function AppSidebar({
  user,
  currentModule,
  onModuleChange,
  ...props
}: AppSidebarProps) {
  const { isModuleVisible } = useModuleVisibility(user);

  // Filter navigation items based on module visibility
  const visibleNavItems = useMemo(() => {
    return data.navMain
      .filter((item) => isModuleVisible(item.module))
      .map((item) => ({
        ...item,
        isActive: currentModule === item.module,
      }));
  }, [isModuleVisible, currentModule]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Header
          team={data.team}
          onModuleChange={onModuleChange}
        />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <NavMain
          items={visibleNavItems}
          currentModule={currentModule}
          onModuleChange={onModuleChange}
        />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
