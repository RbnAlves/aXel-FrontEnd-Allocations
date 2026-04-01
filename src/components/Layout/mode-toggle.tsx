import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

import { useTheme } from "./theme-provider"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button size="icon" className='h-7 w-7 bg-white dark:bg-black relative shadow-none focus:ring-0 border-none hover:bg-white dark:hover:bg-black
    hover:text-black dark:hover:text-white focus:ring-0' onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        <Sun className="absolute h-[1.2rem] w-[1.2rem] text-black dark:hidden transition-all" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] text-white hidden dark:block transition-all" />
        <span className="sr-only">Toggle theme</span>
    </Button>
)
}