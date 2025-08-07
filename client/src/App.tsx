import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "./components/Layout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FirmwareUpload from "./pages/FirmwareUpload";
import DeviceManagement from "./pages/DeviceManagement";
import UpdateJobs from "./pages/UpdateJobs";
import FirmwareLibrary from "./pages/FirmwareLibrary";
import AuditLog from "./pages/AuditLog";
import NotFound from "./pages/not-found";

function AuthenticatedRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/upload" component={FirmwareUpload} />
        <Route path="/firmware" component={FirmwareLibrary} />
        <Route path="/devices" component={DeviceManagement} />
        <Route path="/jobs" component={UpdateJobs} />
        <Route path="/audit" component={AuditLog} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRouter />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
