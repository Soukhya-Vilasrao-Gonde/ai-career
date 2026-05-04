

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from './button'
import {
  ChevronDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  PenBox,
  StarIcon,
} from 'lucide-react'
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { checkUser } from '@/lib/inngest/checkUser'

const Header = async() => {
  await checkUser();
  return (
    <header className="fixed top-0 w-full border-b bg-background/75 backdrop-blur-md z-50 supports-[backdrop-filter]:bg-background/60">
      <nav className="flex justify-between items-center px-4 mx-auto container">
        {/* Logo */}
        <Link href="/">
          <Image
            src="/logo1.jpg"
            width={200}
            height={60}
            alt="Logo"
            className="rounded-2xl h-16 py-1 w-auto object-contain"
          />
        </Link>

        <div className="flex w-[30%] justify-center space-x-2">
          <SignedIn>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:block">Industry Insights</span>
              </Link>
            </Button>
       

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <StarIcon className="h-4 w-4" />
                <span className="hidden md:block">Growth Insights</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href="/resume" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Build Resume</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ai-cover-letter" className="flex items-center gap-2">
                  <PenBox className="h-4 w-4" />
                  <span>AI Cover Letter</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/interview" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>Interview Preparation</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </SignedIn>
          <div className="top-4 flex items-center">
            <SignedOut>
           
            <SignInButton mode="modal">
              <Button variant="outline">
                 Sign In
              </Button>
            </SignInButton>
             
            </SignedOut>
            <SignedIn>
              <UserButton 
              appearance={{
                elements:{
                  avatarBox:'w-10 h-10',
                  userButtonPopoverCard:"shadow-xl",
                  userPreviewMainIdentifier:"font-semibold"
                }
              }}
              afterSignOutUrl='/'
              />
            </SignedIn>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Header
