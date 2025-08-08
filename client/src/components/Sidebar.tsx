import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { 
  Cpu, Upload, Code, Microchip, RotateCcw, 
  History, Users, LogOut 
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: Cpu, current: location === "/" },
    { name: "Upload Firmware", href: "/upload", icon: Upload, current: location === "/upload" },
    { name: "Firmware Library", href: "/firmware", icon: Code, current: location === "/firmware" },
    { name: "Device Management", href: "/devices", icon: Microchip, current: location === "/devices" },
    { name: "Update Jobs", href: "/jobs", icon: RotateCcw, current: location === "/jobs" },
    { name: "Audit Logs", href: "/audit", icon: History, current: location === "/audit" },
  ];

  if (user?.role === "admin") {
    navigation.push({ name: "User Management", href: "/users", icon: Users, current: location === "/users" });
  }

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col w-64 bg-card/50 backdrop-blur-md border-r border-border/50 transition-transform duration-300 ease-in-out",
          isMobile ? "fixed inset-y-0 left-0 z-50" : "relative",
          isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-border/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg">
              <Cpu className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              SecureFOTA
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={isMobile ? onClose : undefined}
              >
                <a
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-ss-2xl rounded-ee-2xl transition-all duration-200",
                    item.current
                      ? "text-primary bg-primary/10 shadow-md border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-border/50">
          <div className="flex items-center space-x-3 px-3 py-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center shadow-md">
              <span className="text-primary-foreground text-sm font-semibold">
                {user?.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.username}
              </p>
              <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {user?.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}