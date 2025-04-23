'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className='bg-white/70 shadow-sm fixed top-0 z-50 w-full'>
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo */}
          <div className='flex-shrink-0'>
            <Link href='/' className='flex items-center'>
              <span className='text-2xl font-bold text-blue-600'>Sky</span>
              <span className='text-2xl font-bold text-gray-800'>HOSTEL</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className='hidden md:block'>
            <ul className='flex space-x-8'>
              <li>
                <Link
                  href='/'
                  className='text-gray-800 hover:text-blue-600 font-medium'
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href='/about'
                  className='text-gray-800 hover:text-blue-600 font-medium'
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href='/gallery'
                  className='text-gray-800 hover:text-blue-600 font-medium'
                >
                  Gallery
                </Link>
              </li>
              <li>
                <Link
                  href='/contact'
                  className='text-gray-800 hover:text-blue-600 font-medium'
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </nav>

          {/* Mobile Menu Button */}
          <div className='md:hidden'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? (
                <X className='h-6 w-6' />
              ) : (
                <Menu className='h-6 w-6' />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className='md:hidden'>
          <div className='px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg'>
            <Link
              href='/'
              className='block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-gray-100'
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href='/about'
              className='block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-gray-100'
              onClick={() => setIsMenuOpen(false)}
            >
              About Us
            </Link>
            <Link
              href='/gallery'
              className='block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-gray-100'
              onClick={() => setIsMenuOpen(false)}
            >
              Gallery
            </Link>
            <Link
              href='/contact'
              className='block px-3 py-2 rounded-md text-base font-medium text-gray-800 hover:bg-gray-100'
              onClick={() => setIsMenuOpen(false)}
            >
              Contact Us
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
