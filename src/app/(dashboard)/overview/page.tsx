import MultiDashboardPage from "@/Chart_layouts/Multiple_dashboard";
import OverviewDashboard from "@/Chart_layouts/overview_dashboard";

const OverviewPage: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Overview Dashboard</h1>
      <OverviewDashboard />
      <MultiDashboardPage />
    </div> 
  );
};

export default OverviewPage;