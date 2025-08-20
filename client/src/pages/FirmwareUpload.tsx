import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { encryptFile, generateSHA256, arrayBufferToBase64 } from "@/lib/crypto";
import { Lock, Upload } from "lucide-react";


interface formDataInterface {
    name: string,
    version: string,
    description: string,
    releaseNotes: string,
    targetDeviceGroup: string,
    transportType: "mqtt" | "ble",
}
export default function FirmwareUpload() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<formDataInterface>({
    name: "",
    version: "",
    description: "",
    releaseNotes: "",
    targetDeviceGroup: "",
    transportType: "mqtt",
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/firmware/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      return response.json();
    },
    onSuccess: ({data}) => {
      toast({
        title: "Upload successful",
        description: "Firmware has been uploaded and encrypted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/firmware"] });
      
      // Reset form
      setSelectedFile(null);
      setFormData({
        name: "",
        version: "",
        description: "",
        releaseNotes: "",
        targetDeviceGroup: "",
        transportType: "mqtt",
      });
      console.log(data)
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload firmware",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a firmware file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name || !formData.version || !formData.targetDeviceGroup) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Note: In a real implementation, you would encrypt the file here
      // For this demo, we'll upload the original file
      const uploadData = new FormData();
      uploadData.append("firmware", selectedFile);
      uploadData.append("name", formData.name);
      uploadData.append("version", formData.version);
      uploadData.append("description", formData.description);
      uploadData.append("releaseNotes", formData.releaseNotes);
      uploadData.append("targetDeviceGroup", formData.targetDeviceGroup);
      uploadData.append("transportType", formData.transportType);

      uploadMutation.mutate(uploadData);
    } catch (error: any) {
      toast({
        title: "Encryption failed",
        description: error.message || "Failed to encrypt firmware",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Firmware</h1>
        <p className="text-gray-500 mt-2">Upload and encrypt new firmware for OTA updates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Firmware Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <Label className="text-base font-medium">Firmware File *</Label>
              <FileUpload
                onFileSelect={setSelectedFile}
                accept=".bin"
                className="mt-2"
                disabled={uploadMutation.isPending}
              />
            </div>

            {/* Metadata Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Firmware Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ESP32-CAM-Main"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  name="version"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="v2.1.4"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="targetDeviceGroup">Target Device Group *</Label>
                <Select 
                  name="targetDeviceGroup"
                  value={formData.targetDeviceGroup} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, targetDeviceGroup: value }))}
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
              
              <div>
                <Label htmlFor="transportType">Update Transport *</Label>
                <Select 
                  name="transportType"
                  value={formData.transportType} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, transportType: value === "mqtt" ? "mqtt" : "ble" }))}
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
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of firmware changes and improvements"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="releaseNotes">Release Notes</Label>
              <Textarea
                id="releaseNotes"
                name="releaseNotes"
                value={formData.releaseNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, releaseNotes: e.target.value }))}
                placeholder="Detailed release notes including bug fixes, new features, and breaking changes"
                rows={4}
              />
            </div>

            {/* Encryption Status */}
            <div className="bg-gray-50 rounded-ss-2xl rounded-ee-2xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Lock className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">AES-256-GCM Encryption</p>
                  <p className="text-xs text-gray-500">Firmware will be encrypted in the browser before upload</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline"
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={uploadMutation.isPending || !selectedFile}
              >
                {uploadMutation.isPending ? (
                  "Uploading..."
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Encrypt
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
