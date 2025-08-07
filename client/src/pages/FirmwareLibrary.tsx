import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Code, Download, RotateCcw, Eye, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function FirmwareLibrary() {
  const { token } = useAuth();

  const fetchFirmwares  = async () => {
    const res = await fetch("/api/firmware", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch firmware");
    return res.json();
  }

  const { data: firmware, isLoading } = useQuery({
    queryKey: ["/api/firmware"],
    enabled: !!token,
    queryFn: fetchFirmwares
  });

  const handleDownload = async (firmwareId: string, filename: string) => {
    try {
      const response = await fetch(`/api/firmware/${firmwareId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading firmware library...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Firmware Library</h1>
          <p className="text-gray-500 mt-2">Manage and deploy firmware versions</p>
        </div>
        
        <Link href="/upload">
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Upload Firmware
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Firmware Versions</CardTitle>
        </CardHeader>
        <CardContent>
          {!Array.isArray(firmware) || firmware.length === 0 ? (
            <div className="text-center py-8">
              <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No firmware uploaded yet</p>
              <p className="text-sm text-gray-400">Upload your first firmware to get started</p>
              <Link href="/upload">
                <Button className="mt-4">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Firmware
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firmware</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Target Group</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(firmware) ? firmware.map((fw: any) => (
                    <TableRow key={fw.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{fw.name}</div>
                          {fw.description && (
                            <div className="text-xs text-gray-500">{fw.description}</div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-mono text-sm">{fw.version}</span>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {fw.targetDeviceGroup.replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className="uppercase">
                          {fw.transportType}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(fw.createdAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={fw.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {fw.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDownload(fw.id, `${fw.name}-${fw.version}.bin`)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
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

      {/* Firmware Details Cards */}
      {Array.isArray(firmware) && firmware.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {firmware.slice(0, 4).map((fw: any) => (
            <Card key={fw.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{fw.name}</CardTitle>
                  <Badge variant="outline">{fw.version}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Description</p>
                    <p className="text-sm text-gray-600">
                      {fw.description || "No description provided"}
                    </p>
                  </div>
                  
                  {fw.releaseNotes && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Release Notes</p>
                      <p className="text-sm text-gray-600">{fw.releaseNotes}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3">
                    <div className="flex space-x-2">
                      <Badge variant="outline" className="capitalize">
                        {fw.targetDeviceGroup.replace('-', ' ')}
                      </Badge>
                      <Badge variant="secondary" className="uppercase">
                        {fw.transportType}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
