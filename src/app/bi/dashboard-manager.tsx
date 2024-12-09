import { useState, useEffect } from 'react';

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

export const useDashboardManager = (userId: string) => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load dashboards from localStorage
  useEffect(() => {
    const loadDashboards = () => {
      try {
        const savedDashboards = localStorage.getItem(`dashboards_${userId}`);
        if (savedDashboards) {
          setDashboards(JSON.parse(savedDashboards));
        }
      } catch (err) {
        console.error('Error loading dashboards:', err);
        setError('Failed to load dashboards');
      }
    };

    loadDashboards();
  }, [userId]);

  // Save dashboards to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(`dashboards_${userId}`, JSON.stringify(dashboards));
    } catch (err) {
      console.error('Error saving dashboards:', err);
      setError('Failed to save dashboards');
    }
  }, [dashboards, userId]);

  const createDashboard = (name: string) => {
    const newDashboard: Dashboard = {
      id: Date.now().toString(),
      name,
      charts: [],
      createdAt: new Date().toISOString()
    };

    setDashboards(prev => [...prev, newDashboard]);
    return newDashboard.id;
  };

  const deleteDashboard = (dashboardId: string) => {
    setDashboards(prev => prev.filter(d => d.id !== dashboardId));
    if (selectedDashboard === dashboardId) {
      setSelectedDashboard(null);
    }
  };

  const addChartToDashboard = (dashboardId: string, chart: Dashboard['charts'][0]) => {
    setDashboards(prev => prev.map(dashboard => {
      if (dashboard.id === dashboardId) {
        return {
          ...dashboard,
          charts: [...dashboard.charts, chart]
        };
      }
      return dashboard;
    }));
  };

  const removeChartFromDashboard = (dashboardId: string, chartId: string) => {
    setDashboards(prev => prev.map(dashboard => {
      if (dashboard.id === dashboardId) {
        return {
          ...dashboard,
          charts: dashboard.charts.filter(chart => chart.id !== chartId)
        };
      }
      return dashboard;
    }));
  };

  const updateChartPosition = (
    dashboardId: string,
    chartId: string,
    position: { x: number; y: number }
  ) => {
    setDashboards(prev => prev.map(dashboard => {
      if (dashboard.id === dashboardId) {
        return {
          ...dashboard,
          charts: dashboard.charts.map(chart => {
            if (chart.id === chartId) {
              return {
                ...chart,
                position
              };
            }
            return chart;
          })
        };
      }
      return dashboard;
    }));
  };

  return {
    dashboards,
    selectedDashboard,
    setSelectedDashboard,
    loading,
    error,
    createDashboard,
    deleteDashboard,
    addChartToDashboard,
    removeChartFromDashboard,
    updateChartPosition
  };
};