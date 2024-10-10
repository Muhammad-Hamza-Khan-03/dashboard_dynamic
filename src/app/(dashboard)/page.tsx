"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart3, LineChart, PieChart, Users, Upload, LayoutDashboard, Search } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          {/* <div className="mr-4 hidden md:flex">
            <Link className="mr-6 flex items-center space-x-2" href="/">
              <BarChart3 className="h-6 w-6" />
              <span className="hidden font-bold sm:inline-block">InsightAI dashboard</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link className="transition-colors hover:text-foreground/80 text-foreground" href="/">
                Home
              </Link>
              <Link className="transition-colors hover:text-foreground/80 text-foreground/60" href="/data-table">
                Data Table
              </Link>
              <Link className="transition-colors hover:text-foreground/80 text-foreground/60" href="/board">
                Board
              </Link>
              <Link className="transition-colors hover:text-foreground/80 text-foreground/60" href="/data-workspace">
                Data Workspace
              </Link>
              <Link className="transition-colors hover:text-foreground/80 text-foreground/60" href="/insight-ai">
                InsightAI
              </Link>
            </nav>
          </div> */}
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Users className="h-4 w-4" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
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
                <Button>Get Started</Button>
                <Button variant="outline">Learn More</Button>
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
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">© 2024 InsighAI dashboard</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}