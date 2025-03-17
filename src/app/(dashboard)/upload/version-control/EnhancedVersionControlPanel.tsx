'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  Undo2, 
  History, 
  Clock, 
  Save,
  ChevronRight,
  Info
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';
import VersionHistoryTimeline from './versionHistoryTimeline';

interface EnhancedVersionControlProps {
  fileId: string;
  userId: string;
  onVersionReverted?: () => void;
}

interface Version {
  version_id: string;
  version_number: number;
  version_name: string;
  description: string;
  created_at: string;
  changes?: Change[];
}

interface Change {
  change_id: string;
  row_number: number | null;
  column_name: string | null;
  old_value: any;
  new_value: any;
  action_type: 'create' | 'update' | 'delete';
  description: string;
  timestamp: string;
}

interface VersionDetailsProps {
  version: Version | null;
  changes: Change[];
  onRevert: () => void;
  loading: boolean;
}

// Component to display version details
const VersionDetails: React.FC<VersionDetailsProps> = ({ 
  version, 
  changes, 
  onRevert,
  loading
}) => {
  if (!version) return null;
  
  // Count changes by type
  const changeStats = {
    create: changes.filter(c => c.action_type === 'create').length,
    update: changes.filter(c => c.action_type === 'update').length,
    delete: changes.filter(c => c.action_type === 'delete').length,
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return timestamp;
    }
  };
  
  // Render a badge for the action type
  const renderActionBadge = (actionType: 'create' | 'update' | 'delete') => {
    switch (actionType) {
      case 'create':
        return <Badge className="bg-green-500">Created</Badge>;
      case 'update':
        return <Badge className="bg-blue-500">Updated</Badge>;
      case 'delete':
        return <Badge className="bg-red-500">Deleted</Badge>;
      default:
        return null;
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
  
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg">
              {version.version_name || `Version ${version.version_number}`}
            </h3>
            <p className="text-sm text-gray-500 flex items-center">
              <Clock className="h-4 w-4 mr-1" /> 
              {formatTimestamp(version.created_at)}
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={onRevert}
            disabled={loading}
            className="flex items-center gap-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Undo2 className="h-4 w-4 mr-1" />
            )}
            Revert to This Version
          </Button>
        </div>
        
        {version.description && (
          <div className="mt-3 text-sm">
            <p className="text-gray-700">{version.description}</p>
          </div>
        )}
        
        <div className="flex gap-3 mt-4">
          <div className="flex gap-1 items-center">
            <Badge variant="outline" className="bg-green-50">
              {changeStats.create} created
            </Badge>
          </div>
          <div className="flex gap-1 items-center">
            <Badge variant="outline" className="bg-blue-50">
              {changeStats.update} updated
            </Badge>
          </div>
          <div className="flex gap-1 items-center">
            <Badge variant="outline" className="bg-red-50">
              {changeStats.delete} deleted
            </Badge>
          </div>
        </div>
      </div>
      
      <h4 className="font-medium text-sm mt-6">Changes in this Version</h4>
      
      <div className="space-y-2">
        {changes.length > 0 ? (
          changes.map((change) => (
            <Card key={change.change_id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-sm">
                    {change.description || 'Change record'}
                  </p>
                  {renderActionBadge(change.action_type)}
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {change.row_number !== null && (
                    <span className="mr-2">Row: {change.row_number}</span>
                  )}
                  {change.column_name && (
                    <span className="mr-2">Column: {change.column_name}</span>
                  )}
                  <span>{formatTimestamp(change.timestamp)}</span>
                </p>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {change.action_type !== 'create' && change.old_value !== null && (
                    <div className="bg-red-50 p-2 rounded text-xs">
                      <p className="font-semibold text-red-700 mb-1">Old Value:</p>
                      {formatValue(change.old_value)}
                    </div>
                  )}
                  {change.action_type !== 'delete' && change.new_value !== null && (
                    <div className="bg-green-50 p-2 rounded text-xs">
                      <p className="font-semibold text-green-700 mb-1">New Value:</p>
                      {formatValue(change.new_value)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No detailed changes found for this version</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EnhancedVersionControlPanel: React.FC<EnhancedVersionControlProps> = ({
  fileId,
  userId,
  onVersionReverted
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [versionDescription, setVersionDescription] = useState('');
  const [versionName, setVersionName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("timeline");

  // Fetch versions when the panel opens
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
      setVersions(response.data.versions || []);
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

  // Fetch changes for a specific version
  const fetchVersionChanges = async (versionId: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/get-version-changes/${userId}/${versionId}`);
      const versionChanges = response.data.changes || [];
      setChanges(versionChanges);
      
      // Update the selected version with changes info
      setSelectedVersion(prev => {
        if (prev && prev.version_id === versionId) {
          return {
            ...prev,
            changes: versionChanges
          };
        }
        return prev;
      });
    } catch (error) {
      console.error('Error fetching version changes:', error);
      toast({
        title: "Error",
        description: "Failed to load version details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting a version
  const handleSelectVersion = (versionId: string) => {
    const version = versions.find(v => v.version_id === versionId) || null;
    setSelectedVersion(version);
    if (version) {
      fetchVersionChanges(version.version_id);
      setActiveTab("details");
    }
  };

  // Handle reverting to a version
  const handleRevertToVersion = async () => {
    if (!selectedVersion) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/revert-to-version/${userId}/${fileId}/${selectedVersion.version_id}`
      );
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: response.data.message,
        });
        
        // Refresh versions after revert
        fetchVersions();
        
        // Close the dialog
        setShowRevertDialog(false);
        
        // Notify parent component
        if (onVersionReverted) {
          onVersionReverted();
        }
      }
    } catch (error) {
      console.error('Error reverting to version:', error);
      toast({
        title: "Error",
        description: "Failed to revert to selected version",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle saving a new version checkpoint
  const handleSaveVersion = async () => {
    if (!userId || !fileId) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/create-version/${userId}/${fileId}`,
        {
          version_name: versionName || `Version ${new Date().toLocaleString()}`,
          description: versionDescription || `Manual checkpoint`
        }
      );
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "New version checkpoint saved",
        });
        
        // Refresh versions
        fetchVersions();
        setSaveDialogOpen(false);
        setVersionName('');
        setVersionDescription('');
      }
    } catch (error) {
      console.error('Error saving version:', error);
      toast({
        title: "Error",
        description: "Failed to save version checkpoint",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Render the appropriate content based on active tab
  const renderTabContent = () => {
    if (activeTab === "timeline") {
      return (
        <ScrollArea className="h-full pr-4">
          {versions.length > 0 ? (
            <VersionHistoryTimeline 
              versions={versions}
              selectedVersionId={selectedVersion?.version_id || null}
              onSelectVersion={handleSelectVersion}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
              ) : (
                <>
                  <History className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="mb-2">No version history available</p>
                  <p className="text-sm">Create a version checkpoint to start tracking changes</p>
                </>
              )}
            </div>
          )}
        </ScrollArea>
      );
    } else if (activeTab === "details" && selectedVersion) {
      return (
        <ScrollArea className="h-full pr-4">
          <VersionDetails 
            version={selectedVersion}
            changes={changes}
            onRevert={() => setShowRevertDialog(true)}
            loading={loading}
          />
        </ScrollArea>
      );
    }
    
    return null;
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[600px] lg:w-[800px] max-w-full overflow-hidden">
          <SheetHeader>
            <SheetTitle>Version Control</SheetTitle>
            <SheetDescription>
              View file history and revert to previous versions
            </SheetDescription>
          </SheetHeader>

          <div className="flex justify-between items-center mt-4 mb-2">
            <div className="flex justify-between items-center w-full">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-between items-center">
                  <TabsList>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    {selectedVersion && (
                      <TabsTrigger value="details">Version Details</TabsTrigger>
                    )}
                  </TabsList>
                  <Button 
                    size="sm"
                    onClick={() => setSaveDialogOpen(true)}
                    className="flex items-center gap-1"
                  >
                    <Save className="h-4 w-4" />
                    Save Current State
                  </Button>
                </div>

                <div className="h-[calc(80vh-12rem)] overflow-hidden mt-4">
                  {/* Fixed: Properly wrap TabsContent inside the Tabs component */}
                  <TabsContent value="timeline" className="h-full overflow-hidden">
                    {renderTabContent()}
                  </TabsContent>

                  <TabsContent value="details" className="h-full overflow-hidden">
                    {renderTabContent()}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Revert Confirmation Dialog */}
      <Dialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Revert</DialogTitle>
            <DialogDescription>
              Are you sure you want to revert to version {selectedVersion?.version_number}?
              This will undo all changes made since this version.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 my-4">
            <p className="text-amber-800 text-sm font-medium">Warning</p>
            <p className="text-amber-700 text-xs mt-1">
              This action will modify your data and create a new version. The changes
              cannot be undone except by further reverting.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevertDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevertToVersion}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reverting...
                </>
              ) : (
                'Revert to This Version'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Version Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Version</DialogTitle>
            <DialogDescription>
              Create a checkpoint of the current file state that you can revert to later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="version-name" className="text-right">
                Version Name
              </Label>
              <Input
                id="version-name"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="e.g., Initial Data"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="version-desc" className="text-right">
                Description
              </Label>
              <Textarea
                id="version-desc"
                value={versionDescription}
                onChange={(e) => setVersionDescription(e.target.value)}
                placeholder="Optional description of this version"
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveVersion}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Version'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedVersionControlPanel;