"use client"
import { Button } from "@/components/ui/button"
import { BarChart3, LineChart, PieChart, Users, Upload, LayoutDashboard, Search } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import NavButton from "@/components/nav-button"
import { useEffect, useRef, useState } from "react"
import LoadingScreen from "@/app/(dashboard)/LoadingScreen"

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading page...");
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentNavigation = useRef<string | null>(null);
  
  // Monitor pathname changes to detect when navigation completes
  useEffect(() => {
    if (isLoading && pathname === currentNavigation.current) {
      // Add a small delay to ensure components have mounted
      setTimeout(() => {
        setIsLoading(false);
        currentNavigation.current = null;
      }, 500);
    }
  }, [pathname, isLoading]);

  // Add safety timeout to ensure loading eventually stops
  useEffect(() => {
    if (isLoading) {
      // Set a maximum loading time of 10 seconds
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        currentNavigation.current = null;
      }, 10000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading]);

  const handleNavigation = (href: string) => {
    if (href === pathname) return;
    
    // Set message based on destination
    let message = "Loading page...";
    if (href === "/upload") {
      message = "Loading data dashboard...";
    } else if (href === "/board") {
      message = "Preparing dashboard visualizations...";
    } else if (href === "/Chat") {
      message = "Loading InSightAI...";
    }
    
    // Set loading state
    currentNavigation.current = href;
    setLoadingMessage(message);
    setIsLoading(true);
    
    // Navigate
    router.push(href);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      {isLoading && <LoadingScreen message={loadingMessage} />}
      
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Create Powerful Data Dashboards
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Design Interactive Dashboards, Analyze Your Data, and Uncover Insights
                </p>
              </div>
              <div className="space-x-4">
                {/* Replace the nested link with a single button */}
                <div className="inline-block">
                  <Button 
                    onClick={() => handleNavigation("/upload")}
                    className="mr-2"
                  >
                    Get Started
                  </Button>
                  
                  <div 
                    onClick={() => handleNavigation("/upload")} 
                    className="inline-block cursor-pointer"
                  >
                    <NavButton
                      href={"/upload"}
                      label={"Data Upload"}
                      isActive={pathname === "/upload"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12">Key Features</h2>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <LayoutDashboard className="h-12 w-12 text-blue-500" />
                <h3 className="text-xl font-bold">Customizable Dashboards</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Create personalized dashboards tailored to your needs
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <LineChart className="h-12 w-12 text-blue-500" />
                <h3 className="text-xl font-bold">Advanced Data Visualizations</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Transform your data into compelling visual stories
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <PieChart className="h-12 w-12 text-blue-500" />
                <h3 className="text-xl font-bold">Multiple Chart Options</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Choose from a variety of chart types to best represent your data
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <Search className="h-12 w-12 text-blue-500" />
                <h3 className="text-xl font-bold">In-depth Data Analysis</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Uncover insights with powerful analytical tools
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12">How It Works</h2>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <Upload className="h-12 w-12 text-blue-500" />
                <h3 className="text-xl font-bold">Upload Your Dataset</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Import your data from various sources
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <BarChart3 className="h-12 w-12 text-blue-500" />
                <h3 className="text-xl font-bold">Choose Your Charts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Select from a wide range of visualization options
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <LayoutDashboard className="h-12 w-12 text-blue-500" />
                <h3 className="text-xl font-bold">Customize and Visualize</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Personalize your dashboard to fit your needs
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border-gray-800 p-4 rounded-lg">
                <Search className="h-12 w-12 text-blue-500" />
                <h3 className="text-xl font-bold">Analyze and Gain Insights</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Explore your data and uncover valuable insights
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex justify-end flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-sm text-gray-500 dark:text-gray-400">© 2024 InsighAI dashboard</p>
      </footer>
    </div>
  )
}