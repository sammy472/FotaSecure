import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type AuditLog = {
  id: string;
  createdAt: Date;
  userId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: unknown;
};

export default function AuditLog() {
  const { token } = useAuth();

  const { data: auditLogs, isLoading, isError, error } = useQuery({
    queryKey: ["/api/audit"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/audit", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json() as Promise<AuditLog[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading audit logs...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {(error as Error).message}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        {!auditLogs || auditLogs.length === 0 ? (
          <div className="text-center py-8">
            <RotateCcw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No audit logs available</p>
            <p className="text-sm text-gray-400">System actions will appear here as logs are generated</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Target ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">#{log.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>{log.userId}</TableCell>
                    <TableCell className="font-semibold">{log.action}</TableCell>
                    <TableCell>{log.targetType}</TableCell>
                    <TableCell>{log.targetId || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
