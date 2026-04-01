"use client";

import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import type { ModuleType } from "@/App";
import { useIsMobile } from "@/hooks/use-mobile";

export function NavMain({
  items,
  currentModule,
  onModuleChange,
}: {
  items: {
    title: string;
    module: ModuleType;
    icon: LucideIcon;
    isActive?: boolean;
    onClick?: () => void;
  }[];
  currentModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
}) {
  const isMobile = useIsMobile();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isActive =
            item.isActive !== undefined
              ? item.isActive
              : currentModule === item.module;
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                size={isMobile ? "lg" : "md"}
                className={
                  isActive
                    ? "cursor-pointer bg-yellow-50 text-yellow-700 border-l-4 border-[#f59e0b] hover:bg-yellow-100 hover:text-yellow-800"
                    : ""
                }
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                    return;
                  }
                  onModuleChange(item.module);
                }}
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
