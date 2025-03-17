'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  GitCompare,
  Plus,
  Minus,
  Edit,
  ArrowLeftRight
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';

interface VersionComparisonProps {
  fileId: string;
  userId: string;
}

interface Version {
  version_id: string;
  version_number: number;
  version_name: string;
  description: string;
  created_at: string;
}

interface ChangesDiff {
  added: any[];
  removed: any[];
  modified: any[];
}

const VersionComparison: React.FC<VersionComparisonProps> = ({
  fileId,
  userId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [fromVersion, setFromVersion] = useState<string>('');
  const [toVersion, setToVersion] = useState<string>('');
  const [diff, setDiff] = useState<ChangesDiff | null>(null);

  // Fetch versions when the dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, fileId, userId]);

  // Fetch versions
  const fetchVersions = async () => {
    if (!userId || !fileId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/get-versions/${userId}/${fileId}`);
      const versionsList = response.data.versions || [];
      setVersions(versionsList);
      
      // Set default selections
      if (versionsList.length >= 2) {
        setFromVersion(versionsList[1].version_id); // Second most recent
        setToVersion(versionsList[0].version_id);   // Most recent
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: "Error",
        description: "Failed to load version history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Compare versions
  const compareVersions = async () => {
    if (!fromVersion || !toVersion) {
      toast({
        title: "Error",
        description: "Please select both versions to compare",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const fromResponse = await axios.get(`http://localhost:5000/get-version-changes/${userId}/${fromVersion}`);
      const toResponse = await axios.get(`http://localhost:5000/get-version-changes/${userId}/${toVersion}`);
      
      const fromChanges = fromResponse.data.changes || [];
      const toChanges = toResponse.data.changes || [];
      
      // Calculate differences
      const diff = calculateDiff(fromChanges, toChanges);
      setDiff(diff);
    } catch (error) {
      console.error('Error comparing versions:', error);
      toast({
        title: "Error",
        description: "Failed to compare versions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate differences between versions
  const calculateDiff = (fromChanges: any[], toChanges: any[]): ChangesDiff => {
    // This is a simplified implementation
    // In a real application, you would do a more sophisticated comparison
    // based on row numbers, timestamps, and other factors
    
    // Create maps for easier lookup
    const fromMap = new Map(fromChanges.map(change => [
      `${change.row_number || ''}:${change.column_name || ''}`,
      change
    ]));
    
    const toMap = new Map(toChanges.map(change => [
      `${change.row_number || ''}:${change.column_name || ''}`,
      change
    ]));
    
    // Find added changes (in to but not in from)
    const added = toChanges.filter(change => {
      const key = `${change.row_number || ''}:${change.column_name || ''}`;
      return !fromMap.has(key);
    });
    
    // Find removed changes (in from but not in to)
    const removed = fromChanges.filter(change => {
      const key = `${change.row_number || ''}:${change.column_name || ''}`;
      return !toMap.has(key);
    });
    
    // Find modified changes (in both but different)
    const modified = toChanges.filter(toChange => {
      const key = `${toChange.row_number || ''}:${toChange.column_name || ''}`;
      const fromChange = fromMap.get(key);
      return fromChange && 
        (JSON.stringify(fromChange.old_value) !== JSON.stringify(toChange.old_value) ||
         JSON.stringify(fromChange.new_value) !== JSON.stringify(toChange.new_value));
    });
    
    return { added, removed, modified };
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return timestamp;
    }
  };
  
  // Format value display for UI
  const formatValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }
    
    if (typeof value === 'object') {
      return (
        <div className="text-xs font-mono bg-gray-50 p-1 rounded overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </div>
      );
    }
    
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    
    return String(value);
  };

  // Get version name by ID
  const getVersionName = (versionId: string): string => {
    const version = versions.find(v => v.version_id === versionId);
    return version 
      ? `${version.version_name || 'Version ' + version.version_number} (${formatTimestamp(version.created_at)})`
      : 'Unknown Version';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <GitCompare className="h-4 w-4" />
          Compare Versions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Compare Versions</DialogTitle>
          <DialogDescription>
            Select two versions to compare the differences between them.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">From Version</label>
              <Select value={fromVersion} onValueChange={setFromVersion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.version_id} value={version.version_id}>
                      {version.version_name || `Version ${version.version_number}`}
                      <span className="text-xs text-gray-500 block">
                        {formatTimestamp(version.created_at)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">To Version</label>
              <Select value={toVersion} onValueChange={setToVersion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.version_id} value={version.version_id}>
                      {version.version_name || `Version ${version.version_number}`}
                      <span className="text-xs text-gray-500 block">
                        {formatTimestamp(version.created_at)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button
            onClick={compareVersions}
            disabled={loading || !fromVersion || !toVersion}
            className="mt-4 w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <GitCompare className="mr-2 h-4 w-4" />
                Compare Versions
              </>
            )}
          </Button>
          
          {diff && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Comparison Results</h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50">
                    {diff.added.length} added
                  </Badge>
                  <Badge variant="outline" className="bg-red-50">
                    {diff.removed.length} removed
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50">
                    {diff.modified.length} modified
                  </Badge>
                </div>
              </div>
              
              <ScrollArea className="h-[420px] rounded-md border">
                {diff.added.length > 0 && (
                  <div className="p-4 border-b">
                    <h4 className="font-medium text-green-700 flex items-center mb-2">
                      <Plus className="h-4 w-4 mr-1" /> Added Changes
                    </h4>
                    <div className="space-y-2">
                      {diff.added.map((change, idx) => (
                        <div key={idx} className="p-2 bg-green-50 rounded-md text-sm">
                          <div className="flex justify-between mb-1">
                            <p className="font-medium">{change.description || 'Change record'}</p>
                            <Badge>
                              {change.action_type === 'create' ? 'Created' :
                               change.action_type === 'update' ? 'Updated' : 'Deleted'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            {change.row_number !== null && (
                              <span className="mr-2">Row: {change.row_number}</span>
                            )}
                            {change.column_name && (
                              <span className="mr-2">Column: {change.column_name}</span>
                            )}
                          </p>
                          {change.new_value !== null && (
                            <div>
                              <p className="text-xs font-semibold mb-1">Value:</p>
                              {formatValue(change.new_value)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {diff.removed.length > 0 && (
                  <div className="p-4 border-b">
                    <h4 className="font-medium text-red-700 flex items-center mb-2">
                      <Minus className="h-4 w-4 mr-1" /> Removed Changes
                    </h4>
                    <div className="space-y-2">
                      {diff.removed.map((change, idx) => (
                        <div key={idx} className="p-2 bg-red-50 rounded-md text-sm">
                          <div className="flex justify-between mb-1">
                            <p className="font-medium">{change.description || 'Change record'}</p>
                            <Badge>
                              {change.action_type === 'create' ? 'Created' :
                               change.action_type === 'update' ? 'Updated' : 'Deleted'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            {change.row_number !== null && (
                              <span className="mr-2">Row: {change.row_number}</span>
                            )}
                            {change.column_name && (
                              <span className="mr-2">Column: {change.column_name}</span>
                            )}
                          </p>
                          {change.old_value !== null && (
                            <div>
                              <p className="text-xs font-semibold mb-1">Value:</p>
                              {formatValue(change.old_value)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {diff.modified.length > 0 && (
                  <div className="p-4">
                    <h4 className="font-medium text-blue-700 flex items-center mb-2">
                      <Edit className="h-4 w-4 mr-1" /> Modified Changes
                    </h4>
                    <div className="space-y-2">
                      {diff.modified.map((change, idx) => (
                        <div key={idx} className="p-2 bg-blue-50 rounded-md text-sm">
                          <div className="flex justify-between mb-1">
                            <p className="font-medium">{change.description || 'Change record'}</p>
                            <Badge>
                              {change.action_type === 'create' ? 'Created' :
                               change.action_type === 'update' ? 'Updated' : 'Deleted'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            {change.row_number !== null && (
                              <span className="mr-2">Row: {change.row_number}</span>
                            )}
                            {change.column_name && (
                              <span className="mr-2">Column: {change.column_name}</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 my-1 text-xs text-blue-700">
                            <span className="font-semibold">Values changed</span>
                            <ArrowLeftRight className="h-3 w-3" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {change.old_value !== null && (
                              <div className="bg-red-50 p-2 rounded">
                                <p className="text-xs font-semibold text-red-700 mb-1">From:</p>
                                {formatValue(change.old_value)}
                              </div>
                            )}
                            {change.new_value !== null && (
                              <div className="bg-green-50 p-2 rounded">
                                <p className="text-xs font-semibold text-green-700 mb-1">To:</p>
                                {formatValue(change.new_value)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <p>No differences found between these versions.</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VersionComparison;