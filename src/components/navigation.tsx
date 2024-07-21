"use client";

import { usePathname } from "next/navigation";
import NavButton from "./nav-button";

const routes = [
    {
        href: "/",
        label: "Home",
    },
    
    {
        href: "/main",
        label: "Main"
    },
            
    {
        href: "/transactions",
        label:"Transactions"
    },
    {
        href: "/accounts",
        label: "Accounts"
    },
    {
        href: "/categories",
        label: "Categories"
    },
    {
        href: "/settings",
        label: "Settings"
    },
    {
        href: "/overview",
        label: "overview"
    },
   
    {
        href: "/multiple",
        label: "Multi_Dashboard"
    },
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