'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-primary">M</div>
            <span className="text-lg font-semibold text-foreground">MERIDIAN</span>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#focus" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Focus
            </Link>
            <Link href="#stream" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Stream
            </Link>
            <Link href="#pool" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Pool
            </Link>
            <Link href="#features" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Features
            </Link>
          </nav>

          {/* CTA - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <button className="px-6 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              Sign In
            </button>
            <button className="px-6 py-2 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <nav className="md:hidden pb-4 space-y-2">
            <Link
              href="#focus"
              className="block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Focus
            </Link>
            <Link
              href="#stream"
              className="block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Stream
            </Link>
            <Link
              href="#pool"
              className="block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Pool
            </Link>
            <Link
              href="#features"
              className="block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <div className="flex items-center justify-between gap-2 px-4 pt-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Theme
              </span>
              <ThemeToggle />
            </div>
            <button className="w-full px-4 py-2 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Get Started
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
