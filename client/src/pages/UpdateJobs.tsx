import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Play, Pause, Square, Plus, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function UpdateJobs() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobForm, setJobForm] = useState({
    firmwareId: "",
    transportType: "mqtt",
    strategy: "sequential",
  });

  const { data: updateJobs, isLoading } = useQuery({
    queryKey: ["/api/update"],
    enabled: !!token,
    queryFn: async () => {
    const res = await fetch("/api/update", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch update jobs");
      return res.json();
    },
  });

  const { data: firmware } = useQuery({
    queryKey: ["/api/firmware"],
    enabled: !!token,
    queryFn: async () => {
    const res = await fetch("/api/firmware", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch firmware");
      return res.json();
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: typeof jobForm) => {
      const response = await fetch("/api/update/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create update job");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Update job created",
        description: "Update job has been created and will start shortly",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/update"] });
      setIsModalOpen(false);
      setJobForm({
        firmwareId: "",
        transportType: "mqtt",
        strategy: "sequential",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create job",
        description: error.message || "Failed to create update job",
        variant: "destructive",
      });
    },
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'job_update') {
        queryClient.invalidateQueries({ queryKey: ["/api/update"] });
      }
    };

    return () => {
      ws.close();
    };
  }, [token, queryClient]);

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    createJobMutation.mutate(jobForm);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
          <Play className="w-5 h-5 text-green-600" />
        </div>;
      case 'in_progress':
        return <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
          <RotateCcw className="w-5 h-5 text-yellow-600 animate-spin" />
        </div>;
      case 'failed':
        return <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
          <Square className="w-5 h-5 text-red-600" />
        </div>;
      default:
        return <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Pause className="w-5 h-5 text-blue-600" />
        </div>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading update jobs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Update Jobs</h1>
          <p className="text-gray-500 mt-2">Monitor firmware update progress in real-time</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Update Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Update Job</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firmware Version *
                </label>
                <Select 
                  value={jobForm.firmwareId} 
                  onValueChange={(value) => setJobForm(prev => ({ ...prev, firmwareId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select firmware version" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(firmware) ? firmware.map((fw: any) => (
                      <SelectItem key={fw.id} value={fw.id}>
                        {fw.name} - {fw.version}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transport Type *
                </label>
                <Select 
                  value={jobForm.transportType} 
                  onValueChange={(value) => setJobForm(prev => ({ ...prev, transportType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mqtt">Secure MQTT</SelectItem>
                    <SelectItem value="ble">Secure BLE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Strategy *
                </label>
                <Select 
                  value={jobForm.strategy} 
                  onValueChange={(value) => setJobForm(prev => ({ ...prev, strategy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential</SelectItem>
                    <SelectItem value="parallel">Parallel</SelectItem>
                    <SelectItem value="rolling">Rolling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={createJobMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createJobMutation.isPending}>
                  {createJobMutation.isPending ? "Creating..." : "Create Job"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Jobs */}
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
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          Update Job #{job.id.slice(0, 8)}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {job.totalDevices} devices • Started {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(job.status)}
                      <Button size="sm" variant="outline">
                        <Pause className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Square className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <ProgressBar
                    value={job.progress}
                    max={100}
                    showLabel
                    className="mb-3"
                    variant={job.status === 'failed' ? 'error' : 'default'}
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
                      <div className="text-lg font-semibold text-red-600">{job.failedDevices}</div>
                      <div className="text-xs text-gray-500">Failed</div>
                    </div>
                  </div>
                </div>
              )) : null}
          </CardContent>
        </Card>
      )}

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Update Job History</CardTitle>
        </CardHeader>
        <CardContent>
          {!Array.isArray(updateJobs) || updateJobs.length === 0 ? (
            <div className="text-center py-8">
              <RotateCcw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No update jobs yet</p>
              <p className="text-sm text-gray-400">Create your first update job to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(updateJobs) ? updateJobs.map((job: any) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <span className="font-mono text-sm">#{job.id.slice(0, 8)}</span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-xs text-gray-500">{job.transportType}</div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm text-gray-900">{job.totalDevices}</span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="w-24">
                          <ProgressBar
                            value={job.progress}
                            max={100}
                            size="sm"
                            variant={job.status === 'failed' ? 'error' : job.status === 'completed' ? 'success' : 'default'}
                          />
                          <span className="text-xs text-gray-500">{job.progress}%</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(job.status)}
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                          {job.status === 'completed' && (
                            <Button size="sm" variant="outline">
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
