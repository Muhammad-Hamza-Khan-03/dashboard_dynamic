"use client";
import {Sheet,
    SheetContent,
    SheetTrigger
} from "@/components/ui/sheet"
import {useMedia} from 'react-use'
import { usePathname } from "next/navigation";
import NavButton from "./nav-button";
import { useState } from "react";
import  {useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const routes = [
    {
        href: "/",
        label: "Home",
    },

    {
href: "../Home",
        label: "Main-Home"
    },
    {
        href: "/upload",
        label: "Data Table"
    },


    {
        href: "/board",
        label: "Board"
    },
    {
        href: "/DataWorkspace",
        label: "Data Workspace"
    },
    {
        href: "/Chat",
        label: "InSightAI"
    },

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
    const [isOpen,setisOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname()
    const isMobile = useMedia("(max-width:1024px)",false);

    const onClick = (href:string)=>
    {
        router.push(href);
        setisOpen(false);
    };
    if(isMobile)
    {
        return (
            <Sheet open={isOpen} onOpenChange={setisOpen}>
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
                        {routes.map((route)=>(
                            <Button
                            variant={route.href==pathname?"secondary":"ghost"}
                            
                            key={route.href}
                            onClick={()=>onClick(route.href)}
                            className="2-full justify-start"
                            >
                            
                                {route.label}

                            </Button>
                        ))}
                    </nav>
                </SheetContent>
            </Sheet>
        )
    }

    
    return (
        <nav className="hidden lg:flex items-center gap-x-2 overflow-x-auto">
            {routes.map((route) => {
                return (
                    <NavButton
                        key={route.href}
                        href={route.href}
                        label={route.label}

                        isActive={pathname === route.href} />
                );
            })}
        </nav>

    )
}
