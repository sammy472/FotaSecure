import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Menu, Bell, Plus, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border/50 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-accent/50 transition-colors"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Monitor and manage your firmware deployments</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle />

          <button className="p-2 text-muted-foreground hover:text-foreground relative rounded-lg hover:bg-accent/50 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-white"></span>
          </button>

          <Link href="/upload">
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Upload Firmware
            </Button>
          </Link>

          {user ? (
            <div className="flex items-center space-x-2 px-3 py-1 bg-accent rounded-lg text-sm text-muted-foreground">
              <UserCircle2 className="w-5 h-5" />
              <span>{user.username}</span>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
