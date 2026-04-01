import * as React from "react";

import { SidebarMenuButton } from "@/components/ui/sidebar";

import type { ModuleType } from "@/App";

export function Header({
  team,
  onModuleChange,
}: {
  team: {
    name: string;
    logo: React.ElementType;
    plan: string;
    module: ModuleType;
  };
  onModuleChange: (module: ModuleType) => void;
}) {
  return (
    <SidebarMenuButton
      size="lg"
      onClick={() => onModuleChange(team.module)}
      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-auto"
    >
      <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
        <team.logo className="size-4" />
      </div>
      <div className="grid flex-1 text-left text-sm leading-tight gap-1 min-w-0 overflow-visible">
        <span className="text-base font-semibold">{team.name}</span>
        <span className="text-[11px] text-sidebar-foreground/70">
          {team.plan}
        </span>
      </div>
    </SidebarMenuButton>
  );
}
