"use client"
import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from './button'
import Image from 'next/image'
import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
const HeroSection = () => {
  const imageref = useRef(null);

  useEffect(()=>{
    const imageele = imageref.current;

    const handlescroll = ()=>{
      const scrollpos = window.scrollY;
      const thresh = 50;
      if(scrollpos > thresh){
        imageele.classList.add("scrolled");
      }
      else{
        imageele.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll" , handlescroll);
    return ()=> window.removeEventListener("scroll" , handlescroll);
  },[])
  return (
<div className=" pt-20 md:pt-48 flex justify-center items-center ">

      <div className=' space-y-6 text-center h-auto '>
        <div className=' space-y-6  mx-auto'>
           <h1 className=' gradient-title text-5xl font-extrabold md:text-6xl lg:text-7xl xl:text-8xl '>
            Your AI Career Coach for 
            <br />
            Professional Success
            </h1> 
            <p className="
            font-semibold w-[50%] mx-auto text-center md:text-3xl    sm:text-xl    lg:text-3xl xl:text-4xl">
  Advance your career with personalized guidance, interview prep, and AI-powered tools for job success.
</p>
        </div>
        <div className="space-x-4">
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/dashboard" signUpForceRedirectUrl="/onboarding">
              <button className="px-8 py-2 bg-blue-600 text-white rounded inline-block text-lg">
                Get Started
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="px-8 py-2 bg-blue-600 text-white rounded inline-block text-lg">
              Get Started
            </Link>
          </SignedIn>
        </div>
    <div className='  hero-image-wrapper mt-5 md:mt-0 '>
      <div ref={imageref} className='hero-image pb-8'>
        <Image
        src="/bg7.jpg"
        alt="Hero background"
        width={950}
        height={600}
        className="w-[70%] h-auto rounded-lg shadow-2xl border mx-auto "
        priority
        />
      </div>
    </div>

      </div>
    </div>
  )
}

export default HeroSection
