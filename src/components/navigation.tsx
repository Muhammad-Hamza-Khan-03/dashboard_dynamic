"use client";
import {Sheet,
    SheetContent,
    SheetTrigger
} from "@/components/ui/sheet"
import {useMedia} from 'react-use'
import { usePathname } from "next/navigation";
import NavButton from "./nav-button";
import { useEffect, useRef, useState } from "react";
import  {useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu,Loader2 } from "lucide-react";
import LoadingScreen from "@/app/(dashboard)/LoadingScreen";
const routes = [
    {
        
        href: "/",
        label: "Home",
    },

    // {
    //     href: "../Home",
    //     label: "Home-Main"
    // },
    {
        href: "/upload",
        label: "Data Upload"
    },


    {
        href: "/board",
        label: "Dashboard"
    },
    // {
    //     href: "/DataWorkspace",
    //     label: "Data Workspace"
    // },
    {
        href: "/Chat",
        label: "InSightAI"
    },
    // {
    //     href: "/overview",
    //     label: "Overview"
    // },   
    // {
    //     href: "/custom_layout",
    //     label:"Custom Layouts"
    // },
    // {
    //     href: "/settings",
    //     label: "Settings"
    // },


]
export const Navigation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Loading page...");
    const router = useRouter();
    const pathname = usePathname();
    const isMobile = useMedia("(max-width:1024px)", false);
    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentNavigation = useRef<string | null>(null);

    useEffect(() => {
        // Clean up timeout on component unmount
        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, []);

    // Monitor pathname changes to detect when navigation completes
    useEffect(() => {
        // If we're loading and the current pathname matches where we're navigating to,
        // that means the page has loaded
        if (isLoading && pathname === currentNavigation.current) {
            // Add a small delay to ensure components have mounted
            setTimeout(() => {
                setIsLoading(false);
                currentNavigation.current = null;
            }, 500);
        }
    }, [pathname, isLoading]);

    // Add safety timeout to ensure loading eventually stops even if something goes wrong
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

    const onClick = (href: string) => {
        // Don't do anything if clicking current route
        if (href === pathname) {
            setIsOpen(false);
            return;
        }

        // Set custom loading message based on the route
        let message = "Loading page...";
        
        if (href === "/upload") {
            message = "Loading data dashboard...";
        } else if (href === "/board") {
            message = "Preparing dashboard visualizations...";
        } else if (href === "/Chat") {
            message = "Loading InSightAI...";
        }
        
        // Track which route we're navigating to
        currentNavigation.current = href;
        
        // Start loading
        setLoadingMessage(message);
        setIsLoading(true);
        setIsOpen(false); // Close mobile menu if open
        
        // Navigate to the new route
        router.push(href);
    };

    if (isMobile) {
        return (
            <>
                {/* Show loading screen when navigating */}
                {isLoading && <LoadingScreen message={loadingMessage} />}
                
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger>
                        <Button
                            variant="outline"
                            size="sm"
                            className="font-normal bg-white/10 hover:bg-white/20 hover:text-white border-none
                            focus-visible:ring-offset-0 focus-visible:ring-transparent
                            outline-none text-white focus:bg-white/30 transition"
                        >
                            <Menu className="size-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="px-2">
                        <nav className="flex flex-col gap-y-2 pt-6">
                            {routes.map((route) => (
                                <Button
                                    variant={route.href === pathname ? "secondary" : "ghost"}
                                    key={route.href}
                                    onClick={() => onClick(route.href)}
                                    className="w-full justify-start"
                                >
                                    {route.label}
                                </Button>
                            ))}
                        </nav>
                    </SheetContent>
                </Sheet>
            </>
        );
    }

    return (
        <>
            {/* Show loading screen when navigating */}
            {/* {isLoading && <LoadingScreen message={loadingMessage} />} */}
            
            <nav className="hidden lg:flex items-center gap-x-2 overflow-x-auto">
                {routes.map((route) => {
                    return (
                        <div
                            key={route.href}
                            onClick={() => onClick(route.href)}
                            className="cursor-pointer"
                        >
                            <NavButton
                                href={route.href}
                                label={route.label}
                                isActive={pathname === route.href}
                            />
                        </div>
                    );
                })}
            </nav>
        </>
    );
};