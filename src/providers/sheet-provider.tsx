"use client"

import { NewAccountSheet } from "@/features/new-account"
import {useMountedState} from "react-use"
export const SheetProvider = () => {
    const isMounted = useMountedState();
    if (!isMounted)
        return null;
    return (
        <>
            <NewAccountSheet />
            </>
    )
}