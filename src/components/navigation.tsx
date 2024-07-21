"use client";

import { usePathname } from "next/navigation";
import NavButton from "./nav-button";

const routes = [
    {
        href: "/",
        label: "Home",
    },
    
    {
        href: "/upload",
        label: "Upload"
    },
            
    {
        href: "/overview",
        label:"Overview"
    },
    {
        href: "/accounts",
        label: "Accounts"
    },
    {
        href: "/multiple",
        label: "Multiple_Dashboards"
    },
    {
        href: "/settings",
        label: "Settings"
    },
    {
        href: "/custom_layout",
        label:"Custom Layouts"
    }
   
   
]
export const Navigation = () => {
    const pathname=usePathname()
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