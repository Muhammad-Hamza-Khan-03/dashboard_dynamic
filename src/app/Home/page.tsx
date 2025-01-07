"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, PieChart, LineChart, Activity, Database, MessageSquare, Zap, Upload, RefreshCw, GitBranch, Terminal, Layout } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import { Pagination, Navigation } from 'swiper/modules'
export default function OverviewPage() {
  // const [hoveredFeature, setHoveredFeature] = useState(null)
  const [currentSlide, setCurrentSlide] = useState(0);
  const features = [
    { icon: <Upload className="h-6 w-6" />, title: 'Manual Data Handling', description: 'Efficiently manage and upload your data with ease.' },
    { icon: <Database className="h-6 w-6" />, title: 'Upload Size (Up to 500MB)', description: 'Handle large datasets seamlessly, supporting files up to 500MB.' },
    { icon: <MessageSquare className="h-6 w-6" />, title: 'Chat with Data', description: 'Leverage AI for instant, conversational insights from your data.' },
    { icon: <RefreshCw className="h-6 w-6" />, title: 'Automated Data Cleaning', description: 'AI-powered data cleaning to ensure your data is accurate and ready for analysis.' },
    { icon: <GitBranch className="h-6 w-6" />, title: 'Relational Diagrams', description: 'Auto-generate relationship diagrams to visualize data connections.' },
    { icon: <Layout className="h-6 w-6" />, title: 'Customizable Dashboards', description: 'Design analytics dashboards tailored to your specific needs and preferences.' },
    { icon: <Zap className="h-6 w-6" />, title: 'AI-Powered Insights', description: 'Get automated insights and trends based on your data analysis.' },
  ]

  const industries = [
    { icon: <Activity className="h-6 w-6" />, name: 'Healthcare', description: 'Drive smarter patient data insights for improved care and operations.' },
    { icon: <BarChart className="h-6 w-6" />, name: 'Finance', description: 'Visualize trends and forecasts in real time for better financial decisions.' },
    { icon: <PieChart className="h-6 w-6" />, name: 'Marketing', description: 'Optimize campaigns with deep data insights and customer behavior analysis.' },
    { icon: <LineChart className="h-6 w-6" />, name: 'Retail', description: 'Analyze sales, trends, and customer behavior to boost your retail strategy.' },
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % features.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + features.length) % features.length);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
        <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-600">InsightAI Dashboard</h1>
            {/* <p className="text-sm text-gray-600 hidden md:block">Your AI-Driven Data Dashboard for Smarter Insights</p> */}
          </div>
        
          <div className="flex space-x-2">
            <Link href={"/sign-in"}><Button variant="outline">Login</Button></Link>
            <Link href={"/sign-up"}><Button>Sign Up</Button></Link>
          </div>
        </nav>
      </header>
      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Unlock the Power of AI for Your Data</h2>
                <p className="text-xl mb-8 leading-relaxed">From data handling to relational insights—all automated for you.</p>
                <div className="flex align-middle">
                  <Link href={"/"}>
                  <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-100 transition-colors duration-300">Get Started</Button>
                  </Link>
                  </div>
              </div>
              <div className="md:w-1/2">
                <Image src="/logo.svg" alt="Dashboard Mockup" width={400} height={400} className="rounded-lg shadow-2xl transform hover:scale-105 transition-transform duration-300" />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-16 text-gray-800">Why InsightAI Dashboard?</h2>
        <Swiper
          slidesPerView={3} // Show 3 slides at a time
          spaceBetween={30} // Add spacing between slides
          navigation // Enable navigation arrows
          pagination={{ clickable: true }} // Enable pagination dots
          modules={[Pagination, Navigation]}
          className="mySwiper"
        >
          {features.map((feature, index) => (
            <SwiperSlide key={index}>
              <Card className="hover:shadow-xl transition-all duration-300 bg-white border-none">
                <CardHeader>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto transform transition-transform duration-300 hover:scale-110">
                    {React.cloneElement(feature.icon, { className: "h-8 w-8 text-blue-600" })}
                  </div>
                  <CardTitle className="text-xl text-blue-600 text-center">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-gray-600">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>

        {/* Use Cases/Industries Section */}
        <section className="py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16 text-gray-800">Tailored for Every Industry</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {industries.map((industry, index) => (
                <Card key={index} className="hover:shadow-xl transition-all duration-300 bg-white border-none">
                  <CardHeader>
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                      {React.cloneElement(industry.icon, { className: "h-8 w-8 text-indigo-600" })}
                    </div>
                    <CardTitle className="text-xl text-indigo-600 text-center">{industry.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-gray-600">{industry.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16 text-gray-800">What Our Users Are Saying</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { quote: "InsightAI Dashboard has revolutionized how we handle patient data. The AI-driven insights have improved our decision-making process significantly.", author: "Dr. Jane Smith", role: "Data Analyst at HealthCare Corp" },
                { quote: "The ability to chat with our data and get instant insights has been a game-changer for our marketing strategies.", author: "John Doe", role: "Marketing Director at TechGrowth Inc" },
                { quote: "The customizable dashboards and automated data cleaning have saved us countless hours and improved our data accuracy.", author: "Sarah Johnson", role: "CFO at Finance Solutions Ltd" }
              ].map((testimonial, index) => (
                <Card key={index} className="bg-gray-50 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="pt-12 pb-8 px-8">
                    <Image src="/next.svg" alt="User Avatar" width={80} height={80} className="rounded-full mx-auto mb-6 border-4 border-indigo-100" />
                    <p className="italic mb-6 text-gray-700 text-center leading-relaxed">"{testimonial.quote}"</p>
                    <p className="font-semibold text-indigo-600 text-center">{testimonial.author}</p>
                    <p className="text-gray-500 text-center text-sm">{testimonial.role}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call-to-Action Section */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-8">Ready to Dive into AI-Powered Insights?</h2>
            <div className="flex justify-center ">
              <Link href={"/"}>
              <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-100 transition-colors duration-300">Get Started</Button>
              </Link>
              </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <h3 className="text-xl font-semibold mb-6">Quick Links</h3>
              <ul className="space-y-3">
                {["Home", "Features", "Use Cases", "Resources", "Contact"].map((link, index) => (
                  <li key={index}><a href="#" className="hover:text-indigo-300 transition-colors duration-300">{link}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-6">Legal</h3>
              <ul className="space-y-3">
                {["Terms of Service", "Privacy Policy"].map((link, index) => (
                  <li key={index}><a href="#" className="hover:text-indigo-300 transition-colors duration-300">{link}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-6">Connect</h3>
              <div className="flex space-x-4">
                {[
                  { href: "#", icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg> },
                  { href: "#", icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0  01-1.153 1.772 4.902 4.902 0 01-1.7721.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg> },
                  { href: "#", icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg> },
                ].map((social, index) => (
                  <a key={index} href={social.href} className="hover:text-indigo-300 transition-colors duration-300">
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
            <div>
              
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-700 text-center">
            <p className="text-gray-400">&copy; 2024 InsightAI Dashboard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}