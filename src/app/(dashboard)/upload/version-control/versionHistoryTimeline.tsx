'use client'
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, RefreshCcw, FileEdit, Trash2, Plus } from "lucide-react";
import { format } from 'date-fns';

interface VersionTimelineProps {
  versions: Version[];
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
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
  action_type: 'create' | 'update' | 'delete';
  change_count?: number;
}

const VersionHistoryTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  selectedVersionId,
  onSelectVersion
}) => {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'update':
        return <FileEdit className="h-4 w-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCcw className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  // Group changes by type and count them
  const getChangeSummary = (version: Version) => {
    if (!version.changes || version.changes.length === 0) return null;
    
    const counts: Record<string, number> = {
      create: 0,
      update: 0,
      delete: 0
    };
    
    version.changes.forEach(change => {
      counts[change.action_type] += 1;
    });
    
    return (
      <div className="flex gap-2 flex-wrap mt-1">
        {Object.entries(counts)
          .filter(([_, count]) => count > 0)
          .map(([action, count]) => (
            <Badge key={action} variant="outline" className="flex items-center gap-1 text-xs">
              {getActionIcon(action)}
              <span>{count} {action}s</span>
            </Badge>
          ))}
      </div>
    );
  };

  return (
    <div className="space-y-2 py-1">
      {versions.map((version, index) => (
        <div key={version.version_id} className="relative">
          {/* Timeline connector line */}
          {index < versions.length - 1 && (
            <div className="absolute left-4 top-6 w-0.5 h-full bg-gray-200 z-0"></div>
          )}
          
          <Card 
            className={`relative z-10 transition-colors cursor-pointer 
                      ${selectedVersionId === version.version_id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'}`}
            onClick={() => onSelectVersion(version.version_id)}
          >
            <CardContent className="p-3 flex items-start gap-4">
              {/* Timeline marker */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                <span className="text-xs font-semibold">
                  {version.version_number}
                </span>
              </div>
              
              <div className="flex-grow min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-sm">
                    {version.version_name || `Version ${version.version_number}`}
                  </h3>
                  <Badge variant="outline" className="flex items-center text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(version.created_at)}
                  </Badge>
                </div>
                
                {version.description && (
                  <p className="text-xs text-gray-600 truncate">{version.description}</p>
                )}
                
                {getChangeSummary(version)}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default VersionHistoryTimeline;