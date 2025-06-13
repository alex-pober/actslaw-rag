// components/Navbar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, User, LogOut, Settings, Home, MessageSquare, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import smartAdvocateClient from '@/lib/smartadvocate/client';
import { useCase } from '@/lib/contexts/case-context';
import Image from 'next/image';

interface CaseSearchResult {
  caseID: number;
  caseNumber: string;
  caseName: string;
  caseStatus: string;
  caseType: string;
}

interface NavbarProps {
  user: any;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const { currentCase, loadCase, clearCase, isLoading } = useCase();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CaseSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Load case from URL parameter on mount and when URL changes
  useEffect(() => {
    const caseParam = searchParams.get('case');
    if (caseParam && (!currentCase || currentCase.caseNumber !== caseParam)) {
      loadCase(caseParam);
    }
  }, [searchParams]);

  // Debounced search function
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await smartAdvocateClient.makeRequest(`case/CaseInfo?Casenumber=${searchQuery.trim()}`);

        const casesArray = Array.isArray(results) ? results : [results];
        setSearchResults(casesArray.filter(Boolean));
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCaseSelect = async (caseNumber: string) => {
    setShowResults(false);
    setSearchQuery('');
    await loadCase(caseNumber);

    // Navigate to the case overview page
    router.push(`/smartadvocate/${caseNumber}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearCase(); // Clear case context on logout
    router.push('/login');
  };

  const handleClearCase = () => {
    clearCase();
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    router.push('/smartadvocate');
  };

  const getUserInitials = (email: string) => {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl flex grow justify-between items-center px-4 sm:px-6 lg:px-8 h-16">
        {/* Logo and Main Navigation */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/images/logo.svg"
              alt="ACTS Law - Abir Cohen Treyzon Salo, LLP"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </Link>

          {user && (
            <div className="hidden md:flex items-center space-x-1">
              <Link
                href="/"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>
              <Link
                href="/chat"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>AI</span>
              </Link>
              <Link
                href="/smartadvocate"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Case Info</span>
              </Link>
            </div>
          )}
        </div>

        {/* Center Search Bar with Current Case Display */}
        {user && (
          <div className="flex-1 max-w-lg mx-8">
            {currentCase ? (
              /* Current Case Display - Full Width When Case Selected */
              (<div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-blue-900 truncate">
                    Case #{currentCase.caseNumber}
                  </div>
                  <div className="text-xs text-blue-700 truncate">
                    {currentCase.caseName}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => {
                      // Toggle search mode
                      setSearchQuery('');
                      setShowResults(false);
                      // Focus search input after clearing case would be handled by useEffect
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Search for different case"
                  >
                  </button>
                  <button
                    onClick={handleClearCase}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Clear current case"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>)
            ) : (
              /* Search Bar - Show When No Case Selected */
              (<div className="relative" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search SA number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 w-full"
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                    {searchResults.map((case_item) => (
                      <button
                        key={case_item.caseID}
                        onClick={() => handleCaseSelect(case_item.caseNumber)}
                        className="w-full px-4 py-3 text-left hover:bg-accent border-b border-border last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-sm">{case_item.caseName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Case #{case_item.caseNumber} • {case_item.caseStatus} • {case_item.caseType}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {/* No Results */}
                {showResults && searchResults.length === 0 && searchQuery.trim() && !isSearching && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50">
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      No cases found for "{searchQuery}"
                    </div>
                  </div>
                )}
              </div>)
            )}
          </div>
        )}

        {/* Right Side - Account Dropdown or Login */}
        <div className="flex items-center space-x-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials(user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
