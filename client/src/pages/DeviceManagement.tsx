import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Microchip, Plus, RotateCcw, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DeviceManagement() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    deviceIdentifier: "",
    name: "",
    deviceGroup: "",
  });

  const { data: devices, isLoading } = useQuery({
    queryKey: ["/api/devices"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/devices", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch devices");
      return res.json();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof registerForm) => {
      const response = await fetch("/api/devices/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device registered",
        description: "Device has been registered successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setIsModalOpen(false);
      setRegisterForm({
        deviceIdentifier: "",
        name: "",
        deviceGroup: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register device",
        variant: "destructive",
      });
    },
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerForm);
  };

  const getStatusBadge = (lastSeenAt: string | null) => {
    if (!lastSeenAt) {
      return <Badge variant="secondary">Never seen</Badge>;
    }

    const lastSeen = new Date(lastSeenAt);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    if (lastSeen > fiveMinutesAgo) {
      return <Badge className="bg-green-100 text-green-800">Online</Badge>;
    } else {
      return <Badge variant="secondary">Offline</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading devices...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Device Management</h1>
          <p className="text-gray-500 mt-2">Monitor and manage connected devices</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Register Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Device</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="deviceIdentifier">Device Identifier *</Label>
                <Input
                  id="deviceIdentifier"
                  value={registerForm.deviceIdentifier}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, deviceIdentifier: e.target.value }))}
                  placeholder="aa:bb:cc:dd:ee:ff"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ESP32-CAM-042"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="deviceGroup">Device Group *</Label>
                <Select 
                  value={registerForm.deviceGroup} 
                  onValueChange={(value) => setRegisterForm(prev => ({ ...prev, deviceGroup: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="esp32-cam">ESP32-CAM Devices</SelectItem>
                    <SelectItem value="stm32-l4">STM32-L4 Sensors</SelectItem>
                    <SelectItem value="esp8266-iot">ESP8266 IoT Modules</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={registerMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Registering..." : "Register Device"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Devices</CardTitle>
        </CardHeader>
        <CardContent>
          {!Array.isArray(devices) || devices.length === 0 ? (
            <div className="text-center py-8">
              <Microchip className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No devices registered yet</p>
              <p className="text-sm text-gray-400">Register your first device to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Current Firmware</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device: any) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Microchip className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{device.name}</div>
                            <div className="text-xs text-gray-500 font-mono">
                              {device.deviceIdentifier}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {device.currentFirmwareId ? (
                          <div>
                            <div className="text-sm text-gray-900">v1.0.0</div>
                            <div className="text-xs text-gray-500">Firmware Name</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">No firmware</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {device.lastSeenAt ? (
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(device.lastSeenAt)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
