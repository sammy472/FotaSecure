import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { 
  Microchip, RotateCcw, CheckCircle, Code, 
  Upload, Plus, Clock, ChevronRight 
} from "lucide-react";

export default function Dashboard() {
  const { token } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
})

  const { data: updateJobs } = useQuery({
    queryKey: ["/api/update"],
    queryFn: async () => {
      const res = await fetch("/api/update", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
})

  const { data: devices } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: async () => {
      const res = await fetch("/api/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
})

  const { data: firmware } = useQuery({
    queryKey: ["/api/firmware"],
    queryFn: async () => {
      const res = await fetch("/api/firmware", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
})

  const recentJobs = Array.isArray(updateJobs) ? updateJobs.slice(0, 3) : [];
  const recentDevices = Array.isArray(devices) ? devices.slice(0, 3) : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mt-1">Monitor and manage your firmware deployments</p>
        </div>
        <Link href="/upload">
          <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Upload Firmware
          </Button>
        </Link>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-200 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Devices</p>
                <p className="text-3xl font-bold text-foreground">{(stats as any)?.totalDevices || 0}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                <Microchip className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-green-600 font-medium bg-green-50 dark:bg-green-950 px-2 py-1 rounded-full">+12%</span>
              <span className="text-sm text-muted-foreground ml-2">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Updates</p>
                <p className="text-3xl font-bold text-foreground">{(stats as any)?.activeUpdates || 0}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 rounded-xl flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-yellow-600 font-medium">
                {recentJobs.filter((j: any) => j.status === 'pending').length} pending
              </span>
              <span className="text-sm text-gray-500 ml-2">updates queued</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900">{(stats as any)?.successRate || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-green-600 font-medium">+0.3%</span>
              <span className="text-sm text-gray-500 ml-2">improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Firmware Versions</p>
                <p className="text-3xl font-bold text-gray-900">{(stats as any)?.firmwareVersions || 0}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Code className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-primary font-medium">
                {Array.isArray(firmware) ? firmware.slice(0, 5).length : 0} latest
              </span>
              <span className="text-sm text-gray-500 ml-2">this week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Updates */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent updates</p>
            ) : (
              recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center space-x-4 py-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    job.status === 'completed' ? 'bg-green-50' :
                    job.status === 'in_progress' ? 'bg-yellow-50' :
                    'bg-blue-50'
                  }`}>
                    {job.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : job.status === 'in_progress' ? (
                      <RotateCcw className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Update Job #{job.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.totalDevices} devices • {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={
                    job.status === 'completed' ? 'default' :
                    job.status === 'in_progress' ? 'secondary' :
                    'outline'
                  }>
                    {job.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/upload">
              <Button variant="outline" className="w-full justify-between h-auto p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Upload New Firmware</p>
                    <p className="text-xs text-gray-500">Add a new firmware version</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Button>
            </Link>

            <Link href="/devices">
              <Button variant="outline" className="w-full justify-between h-auto p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Register Device</p>
                    <p className="text-xs text-gray-500">Add a new device to the fleet</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Button>
            </Link>

            <Link href="/jobs">
              <Button variant="outline" className="w-full justify-between h-auto p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Create Update Job</p>
                    <p className="text-xs text-gray-500">Schedule firmware updates</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Active Update Jobs */}
      {Array.isArray(updateJobs) && updateJobs.filter((job: any) => job.status === 'in_progress').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Update Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.isArray(updateJobs) ? updateJobs
              .filter((job: any) => job.status === 'in_progress')
              .map((job: any) => (
                <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        Update Job #{job.id.slice(0, 8)}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {job.totalDevices} devices • Started {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary">In Progress</Badge>
                  </div>
                  
                  <ProgressBar
                    value={job.progress}
                    max={100}
                    showLabel
                    className="mb-3"
                  />
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-green-600">{job.completedDevices}</div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-yellow-600">
                        {job.totalDevices - job.completedDevices - job.failedDevices}
                      </div>
                      <div className="text-xs text-gray-500">In Progress</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-600">{job.failedDevices}</div>
                      <div className="text-xs text-gray-500">Failed</div>
                    </div>
                  </div>
                </div>
              )) : null}
          </CardContent>
        </Card>
      )}
      {/* Recently Registered Devices */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Registered Devices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentDevices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent devices</p>
            ) : (
              recentDevices.map((device: any) => (
                <div key={device.id} className="flex items-center space-x-4 py-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Microchip className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {device.name || `Device #${device.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Registered {new Date(device.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {device.firmwareVersion && (
                    <Badge variant="outline">{device.firmwareVersion}</Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
    </div>
  );
}
