import { X } from 'lucide-react';
import React, { MouseEventHandler } from 'react'

type Modal_types = {
    isOpen: boolean,
    title?: string,
    onDismiss?: MouseEventHandler,
    children: React.ReactNode
}

const Modal = ({ isOpen, title = "My model", onDismiss, children }: Modal_types) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className='fixed w-screen h-screen bg-black bg-opacity-60 top-0 left-0 z-60 flex justify-center items-center'
            onClick={onDismiss}>
            <div className='w-3/5 h-3/5 bg-white rounded-xl p-6 flex flex-col relative'
                onClick={(event => event.stopPropagation())}>
                <div className='absolute right-4 top-3 text-2xl text-red-600 cursor-pointer'
                    onClick={onDismiss}>
                    <X />
                </div>
                <div className='w-full h-10 flex items-center mb-1 border-b border-gray-300'>
                    <h1>{title}</h1>
                </div>
                {children}
            </div>
        </div>
    )
}

export default Modal
