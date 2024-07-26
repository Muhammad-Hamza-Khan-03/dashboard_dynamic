import React, { MouseEventHandler } from 'react';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface ModalProps {
    isOpen: boolean,
    onDismiss?:React.MouseEventHandler,
    title?: string,
    children: React.ReactNode,
}

const Drag_Modal = ({ isOpen, onDismiss, title="My model", children }:ModalProps) => {
    if (!isOpen) {
        return null;
    }
    return (
        <div className='fixed inset-0 bg-black bg-opacity-60 z-60 flex justify-center items-center' onClick={onDismiss}>
            <div className='w-11/12 h-5/6 bg-white rounded-xl flex flex-col' onClick={(e) => e.stopPropagation()}>
                <div className='flex justify-between items-center p-4 border-b'>
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <Button  size="icon" onClick={onDismiss}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>
                <div className='flex-grow overflow-hidden'>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Drag_Modal;