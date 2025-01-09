import { useState, useEffect, useCallback } from 'react';

export interface Dashboard {
  id: string;
  name: string;
  charts: Array<{
    id: string;
    type: string;
    title: string;
    position: { x: number; y: number };
    graphUrl: string;
  }>;
  createdAt: string;
}

export const useDashboardStorage = (userId: string | undefined) => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboards from localStorage
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const savedDashboards = localStorage.getItem(`dashboards_${userId}`);
      const savedSelected = localStorage.getItem(`selected_dashboard_${userId}`);
      
      if (savedDashboards) {
        const parsedDashboards = JSON.parse(savedDashboards);
        setDashboards(parsedDashboards);
        
        // Only set selected dashboard if it exists in the loaded dashboards
        if (savedSelected && parsedDashboards.some((d: Dashboard) => d.id === savedSelected)) {
          setSelectedDashboard(savedSelected);
        }
      }
    } catch (err) {
      console.error('Error loading dashboards:', err);
      setError('Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Save dashboards to localStorage whenever they change
  useEffect(() => {
    if (!userId) return;

    try {
      localStorage.setItem(`dashboards_${userId}`, JSON.stringify(dashboards));
      
      // Also save selected dashboard
      if (selectedDashboard) {
        localStorage.setItem(`selected_dashboard_${userId}`, selectedDashboard);
      } else {
        localStorage.removeItem(`selected_dashboard_${userId}`);
      }
    } catch (err) {
      console.error('Error saving dashboards:', err);
      setError('Failed to save dashboards');
    }
  }, [dashboards, selectedDashboard, userId]);

  const createDashboard = useCallback((name: string) => {
    const newDashboard: Dashboard = {
      id: `dashboard_${Date.now()}`,
      name,
      charts: [],
      createdAt: new Date().toISOString()
    };

    setDashboards(prev => [...prev, newDashboard]);
    setSelectedDashboard(newDashboard.id);
    return newDashboard.id;
  }, []);

  const deleteDashboard = useCallback((dashboardId: string) => {
    setDashboards(prev => prev.filter(d => d.id !== dashboardId));
    if (selectedDashboard === dashboardId) {
      setSelectedDashboard(null);
      localStorage.removeItem(`selected_dashboard_${userId}`);
    }
  }, [selectedDashboard, userId]);

  const updateDashboard = useCallback((dashboardId: string, updatedDashboard: Partial<Dashboard>) => {
    setDashboards(prev => prev.map(dashboard => 
      dashboard.id === dashboardId 
        ? { ...dashboard, ...updatedDashboard }
        : dashboard
    ));
  }, []);

  return {
    dashboards,
    selectedDashboard,
    setSelectedDashboard,
    loading,
    error,
    createDashboard,
    deleteDashboard,
    updateDashboard
  };
};