"use client"

import Image from "next/image";
import Link from "next/link";
import React from 'react'

export const Header = () => {
    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex items-center justify-between">
          {/* logo */}
                <div className="flex items-center">
                  <Image
                    src={"/image-logo.jpg"}
                    alt="Image Identifier logo"
                    width={40}
                    height={40}
                    className="mr-3"
                    />
                    <h1 className="text-2xl font-bold text-green-600">AfriPlant Identifier</h1>
                </div>
          {/* menus */}
                <nav>
                    <ul className="flex space-x-4">
                        <Link href={"#"} className="text-green-600 hover:text-green-800 transition duration-150 ease-in-out">Home</Link>

                        <Link href={"#how-it-works"} className="text-green-600 hover:text-green-800 transition duration-150 ease-in-out">How it Works</Link>

                        <Link href={"#features"} className="text-green-600 hover:text-green-800 transition duration-150 ease-in-out">Features</Link>
                    </ul>
                </nav>
            </div>
        </div>
    </header>
    )
}