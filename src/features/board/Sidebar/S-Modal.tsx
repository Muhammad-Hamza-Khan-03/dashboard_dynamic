import { X } from 'lucide-react';
import React, { MouseEventHandler } from 'react';
import { Button } from "@/components/ui/button";

type Modal_types = {
    isOpen: boolean,
    title?: string,
    onDismiss?: MouseEventHandler,
    children: React.ReactNode,
};

const Modal = ({ isOpen, title = "My modal", onDismiss, children }: Modal_types) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className='fixed inset-0 bg-black bg-opacity-60 z-60 flex justify-center items-center' onClick={onDismiss}>
            <div className='w-4/5 h-4/5 bg-white rounded-xl p-6 flex flex-col relative' onClick={(event) => event.stopPropagation()}>
                <div className='flex justify-between items-center mb-4'>
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <Button variant="ghost" size="icon" onClick={onDismiss}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>
                <div className='flex-grow overflow-auto'>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;