import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function handleLogout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}
