'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LandingDomain } from '@/enums/landing.enum';
import { CORE_FEATURES } from '@/data/landing.data';
import { motion, AnimatePresence } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

// Letter Stagger sub-component for premium stagger entrances of words in loader
const LetterStagger = ({ word }: { word: string }) => {
  const letters = Array.from(word);
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      }
    }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.5 } }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex justify-center flex-wrap gap-[1px]"
    >
      {letters.map((char, index) => (
        <motion.span
          key={index}
          variants={item}
          className="font-sans font-black text-[38px] sm:text-[80px] text-white tracking-tighter uppercase leading-none"
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.div>
  );
};

export default function LandingPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const sec4Ref = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [time, setTime] = useState('');

  const words = ["always safe.", "always protected.", "always covered.", "always assured."];
  const [wordIdx, setWordIdx] = useState(0);
  const [subText, setSubText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Cinematic website loader states
  const [loading, setLoading] = useState(true);
  const [loaderPhase, setLoaderPhase] = useState(0); // 0: Protection, 1: Care, 2: Peace, 3: Pause, 4: Split, 5: Done
  const [progressWidth, setProgressWidth] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroTimelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Progress line increment over 2.7s
    const progressInterval = setInterval(() => {
      setProgressWidth((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 27);

    // Timeline state loops - adjusted to give words more visibility
    const t1 = setTimeout(() => setLoaderPhase(1), 800);
    const t2 = setTimeout(() => setLoaderPhase(2), 1500);
    const t3 = setTimeout(() => setLoaderPhase(3), 2300);
    const t4 = setTimeout(() => {
      setLoaderPhase(4);
      // Play hero timeline 0.2s before curtains are fully split
      if (heroTimelineRef.current) {
        heroTimelineRef.current.play();
      }
    }, 2700);
    const t5 = setTimeout(() => setLoading(false), 3300);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fullWord = words[wordIdx];
    
    if (isDeleting) {
      timer = setTimeout(() => {
        setSubText((prev) => prev.slice(0, -1));
      }, 40);
    } else {
      timer = setTimeout(() => {
        setSubText((prev) => fullWord.slice(0, prev.length + 1));
      }, 80);
    }

    if (!isDeleting && subText === fullWord) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && subText === "") {
      setIsDeleting(false);
      setWordIdx((prev) => (prev + 1) % words.length);
    }

    return () => clearTimeout(timer);
  }, [subText, isDeleting, wordIdx]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entry animations for Section 1 Hero - paused initially until curtain splits
      const tl = gsap.timeline({ paused: true });
      heroTimelineRef.current = tl;

      tl.from('.glass-nav', {
        y: -100,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
        .from(
          '.hero-word',
          {
            y: 100,
            clipPath: 'inset(0 0 100% 0)',
            duration: 1.2,
            stagger: 0.08,
            ease: 'expo.out',
          },
          '-=0.2'
        )
        .from(
          '.hero-object',
          {
            y: -120,
            opacity: 0,
            duration: 1.6,
            ease: 'expo.out',
          },
          '-=0.8'
        )
        .from(
          '.ann-line',
          {
            strokeDashoffset: 300,
            strokeDasharray: 300,
            duration: 1.2,
            stagger: 0.15,
            ease: 'expo.out',
          },
          '-=0.4'
        )
        .from(
          '.ann-label, .info-panel, .feature-item, .ann-marker',
          {
            opacity: 0,
            stagger: 0.08,
            duration: 0.6,
          },
          '-=0.4'
        )
        .from(
          '.cross-marker',
          {
            opacity: 0,
            scale: 0,
            stagger: 0.1,
            duration: 0.4,
          },
          '-=0.2'
        )
        .call(() => {
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          gsap.to('.hero-object', {
            y: isMobile ? -6 : -20,
            duration: isMobile ? 4 : 3,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          });
        });

      gsap.to('.scroll-arrow', {
        y: 8,
        duration: 1.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 2.5,
      });

      ScrollTrigger.create({
        start: '100px top',
        onEnter: () =>
          gsap.to('.scroll-arrow', {
            opacity: 0,
            duration: 0.4,
          }),
        onLeaveBack: () =>
          gsap.to('.scroll-arrow', {
            opacity: 1,
            duration: 0.4,
          }),
      });

      // SECTION 3: Robust GSAP Horizontal Pin Scroll Lock & Pin Spacing
      const track = document.querySelector('.sec3-track') as HTMLElement;
      if (track) {
        gsap.to('.sec3-track', {
          x: () => -(track.scrollWidth - window.innerWidth + 120),
          ease: 'none',
          scrollTrigger: {
            trigger: '.sec3-scroll-container',
            start: 'top top',
            end: () => `+=${track.scrollWidth}`,
            pin: true,
            scrub: 0.5,
            invalidateOnRefresh: true,
            anticipatePin: 1
          }
        });
      }

      // Parallax on Section 2 decorative number
      gsap.to('.sec2-ghost-num', {
        y: -60,
        ease: 'none',
        scrollTrigger: {
          trigger: '.sec2-container',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });

      // Parallax on Section 4 left image
      gsap.to('.sec4-image-parallax', {
        y: -40,
        ease: 'none',
        scrollTrigger: {
          trigger: '.sec4-container',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });

    }, pageRef);

    return () => ctx.revert();
  }, []);

  const handleAnnEnter = (id: string) => {
    gsap.to(`.ann-line-${id}`, {
      stroke: '#1E5B3B',
      strokeWidth: 0.2,
      duration: 0.3,
    });
    gsap.to(`.arrow-head-${id}`, {
      fill: '#1E5B3B',
      duration: 0.3,
    });
    gsap.to(`.ann-marker-${id}`, {
      scale: 1.8,
      backgroundColor: '#1E5B3B',
      duration: 0.3,
    });
    gsap.to(`.ann-label-${id}`, {
      color: '#1E5B3B',
      x: 4,
      duration: 0.3,
    });
  };

  const handleAnnLeave = (id: string) => {
    gsap.to(`.ann-line-${id}`, {
      stroke: '#1E5B3B',
      strokeWidth: 0.15,
      duration: 0.3,
    });
    gsap.to(`.arrow-head-${id}`, {
      fill: '#1E5B3B',
      duration: 0.3,
    });
    gsap.to(`.ann-marker-${id}`, {
      scale: 1,
      backgroundColor: '#1E5B3B',
      duration: 0.3,
    });
    gsap.to(`.ann-label-${id}`, {
      color: '#1E5B3B',
      x: 0,
      duration: 0.3,
    });
  };

  const handleFeatureEnter = (idx: number) => {
    gsap.to(`.feature-label-${idx}`, {
      x: 6,
      color: '#1E5B3B',
      duration: 0.25,
      ease: 'power2.out',
    });
    gsap.to(`.feature-slashes-${idx}`, {
      color: '#1E5B3B',
      duration: 0.25,
    });
  };

  const handleFeatureLeave = (idx: number) => {
    gsap.to(`.feature-label-${idx}`, {
      x: 0,
      color: '#0D0D0D',
      duration: 0.25,
    });
    gsap.to(`.feature-slashes-${idx}`, {
      color: '#CCCCCC',
      duration: 0.25,
    });
  };

  const handlePanelEnter = () => {
    gsap.to('.info-panel', {
      y: -4,
      boxShadow: '0 8px 24px rgba(30,91,59,0.12)',
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const handlePanelLeave = () => {
    gsap.to('.info-panel', {
      y: 0,
      boxShadow: 'none',
      duration: 0.3,
    });
  };

  const handleObjectEnter = () => {
    gsap.to('.hero-object', {
      scale: 1.03,
      duration: 0.6,
      ease: 'power2.out',
    });
  };

  const handleObjectLeave = () => {
    gsap.to('.hero-object', {
      scale: 1,
      duration: 0.6,
      ease: 'power2.out',
    });
  };

  const crossClasses = [
    'left-[18vw] top-[38vh]',
    'left-[74vw] top-[22vh]',
    'left-[12vw] top-[72vh]',
    'left-[80vw] top-[68vh]',
  ];

  const stepsData = [
    {
      num: "01",
      tagline: "Upload Your",
      highlight: "Report.",
      body: "PDF or photo. Takes 10 seconds.",
      delay: 0,
      position: "lg:self-start lg:justify-self-start lg:-translate-y-4"
    },
    {
      num: "02",
      tagline: "AI Reads",
      highlight: "Everything.",
      body: "HbA1c, blood pressure, risk factors. All on your device. Nothing leaves your phone.",
      delay: 0.2,
      position: "lg:self-center lg:justify-self-center lg:translate-x-16 lg:translate-y-8"
    },
    {
      num: "03",
      tagline: "Get Your",
      highlight: "Perfect Plan.",
      body: "Ranked, explained, ready to compare.",
      delay: 0.4,
      position: "lg:self-end lg:justify-self-end lg:translate-x-24 lg:translate-y-16"
    }
  ];

  const plansData = [
    {
      num: "01",
      category: "CRITICAL COVER",
      name: "Assure Gold",
      coverage: "₹5,00,000",
      premium: "₹12,800/yr",
      diabetes: "Day 1",
      why: "Day 1 cover for diabetes and hypertension based on your diagnostic lab results.",
      score: "8.8/10",
      bg: "bg-white"
    },
    {
      num: "02",
      category: "FAMILY SECURITY",
      name: "Optima Secure",
      coverage: "₹10,00,000",
      premium: "₹18,500/yr",
      diabetes: "Day 1",
      why: "Unlocks double coverage instantly with zero waiting period for accidental emergencies.",
      score: "9.4/10",
      bg: "bg-white/90"
    },
    {
      num: "03",
      category: "ACTIVE LIFE",
      name: "ReAssure 2.0",
      coverage: "₹7,50,000",
      premium: "₹14,200/yr",
      diabetes: "Day 1",
      why: "Lock-in premium feature safeguards your long-term plan pricing from inflation.",
      score: "8.6/10",
      bg: "bg-white"
    },
    {
      num: "04",
      category: "SENIOR CARE",
      name: "Care Supreme",
      coverage: "₹5,00,000",
      premium: "₹11,900/yr",
      diabetes: "Day 1",
      why: "Highly competitive premium rating matching your excellent blood pressure levels.",
      score: "8.2/10",
      bg: "bg-white/90"
    }
  ];

  const testimonialsData = [
    {
      quote: "I uploaded my report and had 5 plan options in under 3 minutes. I didn't even need to call anyone.",
      name: "Rajesh K.",
      detail: "Mumbai, covered since 2023"
    },
    {
      quote: "Finally an insurance app that explained everything in plain language. My wife and I chose our plan together.",
      name: "Priya & Amit S.",
      detail: "Bangalore, covered since 2024"
    },
    {
      quote: "The stress test showed exactly what we'd pay in an emergency. That one feature sold us.",
      name: "Meera T.",
      detail: "Delhi, covered since 2023"
    }
  ];

  return (
    <div ref={pageRef} className="w-screen min-h-screen overflow-x-hidden bg-sutera-bg scroll-smooth pt-20">
      
      {/* CINEMATIC WEBSITE LOADER */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex pointer-events-none select-none">
          {/* Left Curtain Half */}
          <motion.div
            initial={{ x: 0 }}
            animate={loaderPhase >= 4 ? { x: "-100%" } : { x: 0 }}
            transition={{ duration: 0.6, ease: [0.87, 0, 0.13, 1] }}
            className="w-1/2 h-full bg-[#1E5B3B] origin-right relative"
          />
          {/* Right Curtain Half */}
          <motion.div
            initial={{ x: 0 }}
            animate={loaderPhase >= 4 ? { x: "100%" } : { x: 0 }}
            transition={{ duration: 0.6, ease: [0.87, 0, 0.13, 1] }}
            className="w-1/2 h-full bg-[#1E5B3B] origin-left relative"
          />

          {/* Staggered Words Centered on Screen */}
          {loaderPhase < 3 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <motion.div
                initial={{ opacity: 1 }}
                animate={
                  (loaderPhase === 0 && progressWidth >= 28) ||
                  (loaderPhase === 1 && progressWidth >= 53) ||
                  (loaderPhase === 2 && progressWidth >= 83)
                    ? { opacity: 0 }
                    : { opacity: 1 }
                }
                transition={{ duration: 0.3 }}
              >
                {loaderPhase === 0 && <LetterStagger word="PROTECTION." />}
                {loaderPhase === 1 && <LetterStagger word="CARE." />}
                {loaderPhase === 2 && <LetterStagger word="PEACE OF MIND." />}
              </motion.div>
            </div>
          )}

          {/* Bottom loading progress line */}
          {loaderPhase < 4 && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20 z-20">
              <div
                className="h-full bg-white transition-all duration-75"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          )}
        </div>
      )}
      
      {/* STICKY GLASSY NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/70 backdrop-blur-md border-b border-black/[0.04] z-50 flex items-center justify-between px-6 sm:px-12 md:px-20 select-none">
        
        {/* Brand logo & bold "OUTSURANCE" text */}
        <div
          className="flex items-center gap-1 select-none cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <img
            src="/fidsurance-logo.png"
            alt="Outsurance Logo"
            className="h-10 md:h-12 w-auto object-contain"
          />
          <span className="font-space-mono text-[13px] md:text-[18px] tracking-[0.06em] text-black font-black uppercase select-none leading-none -ml-1">
            OUTSURANCE
          </span>
        </div>

        {/* Center navigation links with dynamic smooth anchor scroll */}
        <div className="hidden lg:flex items-center gap-8 font-space-mono text-[11px] text-neutral-600 font-bold uppercase tracking-wider">
          <button
            onClick={() => {
              const el = document.querySelector('.sec2-container');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-[#1E5B3B] transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={() => {
              const el = document.querySelector('.sec3-scroll-container');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-[#1E5B3B] transition-colors cursor-pointer"
          >
            Find a Plan
          </button>
          <button
            onClick={() => {
              const el = document.querySelector('.sec4-container');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-[#1E5B3B] transition-colors cursor-pointer"
          >
            Real Families
          </button>
          <button
            onClick={() => {
              const el = document.querySelector('.sec5-anchor');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-[#1E5B3B] transition-colors cursor-pointer"
          >
            Get Started
          </button>
        </div>

        {/* Action button triggers including Login / Sign Up */}
        <div className="hidden lg:flex items-center gap-4 font-space-mono text-[11px] font-bold">
          <button
            onClick={() => router.push('/login')}
            className="text-neutral-700 hover:text-black border border-black/10 hover:border-black/30 px-4 py-2 rounded-full transition-colors cursor-pointer uppercase tracking-wider"
          >
            [ Login ]
          </button>
          <button
            onClick={() => router.push('/register')}
            className="bg-[#1E5B3B] hover:bg-[#256c45] text-white px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-sm hover:shadow-md uppercase tracking-wider text-[10px]"
          >
            Start Free →
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden flex flex-col justify-center items-center gap-1.5 w-10 h-10 border border-black/5 rounded-full bg-white/40 cursor-pointer hover:bg-white/80 transition-colors z-50"
        >
          <motion.span
            animate={mobileMenuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
            className="w-5 h-[1.5px] bg-black block origin-center transition-transform"
          />
          <motion.span
            animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
            className="w-5 h-[1.5px] bg-black block transition-opacity"
          />
          <motion.span
            animate={mobileMenuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
            className="w-5 h-[1.5px] bg-black block origin-center transition-transform"
          />
        </button>
      </nav>

      {/* Mobile Menu Glassy Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 top-20 bg-white/95 backdrop-blur-lg z-40 flex flex-col items-center justify-center gap-8 font-space-mono text-[16px] font-bold uppercase tracking-wider text-neutral-800"
          >
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                const el = document.querySelector('.sec2-container');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-[#1E5B3B] transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                const el = document.querySelector('.sec3-scroll-container');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-[#1E5B3B] transition-colors cursor-pointer"
            >
              Find a Plan
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                const el = document.querySelector('.sec4-container');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-[#1E5B3B] transition-colors cursor-pointer"
            >
              Real Families
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                const el = document.querySelector('.sec5-anchor');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-[#1E5B3B] transition-colors cursor-pointer"
            >
              Get Started
            </button>
            
            <div className="w-4/5 h-[1px] bg-black/5 my-2" />

            <div className="flex flex-col items-center gap-4 w-4/5">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/login');
                }}
                className="w-full text-center text-neutral-700 hover:text-black border border-black/15 py-3.5 rounded-full transition-colors cursor-pointer"
              >
                [ Login ]
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/register');
                }}
                className="w-full text-center bg-[#1E5B3B] hover:bg-[#256c45] text-white py-3.5 rounded-full transition-all cursor-pointer shadow-sm"
              >
                Start Free →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 1 — HERO */}
      <div className="w-screen h-screen overflow-hidden bg-sutera-bg relative select-none cursor-crosshair">

        <div className="absolute left-6 top-[16%] md:top-1/2 md:-translate-y-[60%] z-10 flex flex-col pointer-events-none select-none max-w-[85vw] md:max-w-[40vw]">
          <h1 className="leading-[0.95] tracking-tighter text-[clamp(28px,6.5vw,42px)] md:text-[clamp(44px,5.8vw,80px)]">
            <div className="overflow-hidden">
              <span className="hero-word inline-block font-black uppercase text-sutera-black">
                YOUR HEALTH,
              </span>
            </div>
            <div className="overflow-hidden">
              <span className="hero-word inline-block font-serif italic font-normal text-[#1E5B3B] lowercase tracking-normal pl-1">
                {subText}
                <span className="animate-pulse font-sans font-light text-[#1E5B3B]">|</span>
              </span>
            </div>
          </h1>
          <div className="mt-6 md:mt-10 font-space-mono text-[9px] md:text-[11px] text-sutera-grey tracking-wider leading-relaxed max-w-[180px] md:max-w-[200px] pointer-events-auto">
            <div>UPLOAD YOUR HEALTH REPORT.</div>
            <div>GET THE RIGHT PLAN.</div>
            <div>IN MINUTES.</div>
          </div>
        </div>

        <div className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 w-[92vw] md:w-[clamp(450px,50vw,780px)] aspect-video z-[2] pointer-events-none select-none">
          <div
            className="hero-object w-full h-full overflow-hidden flex items-center justify-center rounded-none pointer-events-auto cursor-pointer transform-gpu will-change-transform"
            onMouseEnter={handleObjectEnter}
            onMouseLeave={handleObjectLeave}
          >
            <video
              src="/hero-video.mp4"
              poster="/hero-cinematic.png"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-top origin-top scale-[1.18] pointer-events-none transform-gpu will-change-transform"
            />
          </div>
        </div>

        <svg
          className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            {['A', 'B', 'C', 'D', 'E'].map((id) => (
              <marker
                key={id}
                id={`arrowhead-${id}`}
                viewBox="0 0 10 10"
                refX="1"
                refY="5"
                markerWidth="3"
                markerHeight="3"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 1 L 8 5 L 0 9 z"
                  fill="#1E5B3B"
                  className={`arrow-head-${id} transition-colors duration-300`}
                />
              </marker>
            ))}
          </defs>
          <path
            className="ann-line ann-line-A stroke-[#1E5B3B] fill-none pointer-events-auto cursor-pointer"
            strokeWidth="0.15"
            strokeDasharray="300"
            strokeDashoffset="0"
            d="M 62 28 L 70 20 L 78 20"
            markerStart="url(#arrowhead-A)"
            onMouseEnter={() => handleAnnEnter('A')}
            onMouseLeave={() => handleAnnLeave('A')}
          />
          <path
            className="ann-line ann-line-B stroke-[#1E5B3B] fill-none pointer-events-auto cursor-pointer"
            strokeWidth="0.15"
            strokeDasharray="300"
            strokeDashoffset="0"
            d="M 33 52 L 25 52"
            markerStart="url(#arrowhead-B)"
            onMouseEnter={() => handleAnnEnter('B')}
            onMouseLeave={() => handleAnnLeave('B')}
          />
          <path
            className="ann-line ann-line-C stroke-[#1E5B3B] fill-none pointer-events-auto cursor-pointer"
            strokeWidth="0.15"
            strokeDasharray="300"
            strokeDashoffset="0"
            d="M 67 58 L 75 58"
            markerStart="url(#arrowhead-C)"
            onMouseEnter={() => handleAnnEnter('C')}
            onMouseLeave={() => handleAnnLeave('C')}
          />
          <path
            className="ann-line ann-line-D stroke-[#1E5B3B] fill-none pointer-events-auto cursor-pointer"
            strokeWidth="0.15"
            strokeDasharray="300"
            strokeDashoffset="0"
            d="M 64 72 L 78 72 L 78 82"
            markerStart="url(#arrowhead-D)"
            onMouseEnter={() => handleAnnEnter('D')}
            onMouseLeave={() => handleAnnLeave('D')}
          />
          <path
            className="ann-line ann-line-E stroke-[#1E5B3B] fill-none pointer-events-auto cursor-pointer"
            strokeWidth="0.15"
            strokeDasharray="300"
            strokeDashoffset="0"
            d="M 50 75 L 50 82"
            markerStart="url(#arrowhead-E)"
            onMouseEnter={() => handleAnnEnter('E')}
            onMouseLeave={() => handleAnnLeave('E')}
          />
        </svg>

        <div
          className="hidden md:block ann-marker ann-marker-A absolute left-[62%] top-[28%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('A')}
          onMouseLeave={() => handleAnnLeave('A')}
        />
        <div
          className="hidden md:block ann-marker ann-marker-A absolute left-[70%] top-[20%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('A')}
          onMouseLeave={() => handleAnnLeave('A')}
        />
        <div
          className="hidden md:block ann-marker ann-marker-A absolute left-[78%] top-[20%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('A')}
          onMouseLeave={() => handleAnnLeave('A')}
        />

        <div
          className="hidden md:block ann-marker ann-marker-B absolute left-[33%] top-[52%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('B')}
          onMouseLeave={() => handleAnnLeave('B')}
        />
        <div
          className="hidden md:block ann-marker ann-marker-B absolute left-[25%] top-[52%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('B')}
          onMouseLeave={() => handleAnnLeave('B')}
        />

        <div
          className="hidden md:block ann-marker ann-marker-C absolute left-[67%] top-[58%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('C')}
          onMouseLeave={() => handleAnnLeave('C')}
        />
        <div
          className="hidden md:block ann-marker ann-marker-C absolute left-[75%] top-[58%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('C')}
          onMouseLeave={() => handleAnnLeave('C')}
        />

        <div
          className="hidden md:block ann-marker ann-marker-D absolute left-[64%] top-[72%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('D')}
          onMouseLeave={() => handleAnnLeave('D')}
        />
        <div
          className="hidden md:block ann-marker ann-marker-D absolute left-[78%] top-[72%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('D')}
          onMouseLeave={() => handleAnnLeave('D')}
        />
        <div
          className="hidden md:block ann-marker ann-marker-D absolute left-[78%] top-[82%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('D')}
          onMouseLeave={() => handleAnnLeave('D')}
        />

        <div
          className="hidden md:block ann-marker ann-marker-E absolute left-[50%] top-[75%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('E')}
          onMouseLeave={() => handleAnnLeave('E')}
        />
        <div
          className="hidden md:block ann-marker ann-marker-E absolute left-[50%] top-[82%] w-1 h-1 bg-[#1E5B3B] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-10 rounded-none"
          onMouseEnter={() => handleAnnEnter('E')}
          onMouseLeave={() => handleAnnLeave('E')}
        />

        <div
          className="hidden md:block ann-label ann-label-A absolute left-[72%] md:left-[79%] top-[17%] font-space-mono text-[7px] md:text-[9px] text-[#1E5B3B] leading-tight max-w-[90px] md:max-w-[160px] pointer-events-auto cursor-pointer select-none z-10"
          onMouseEnter={() => handleAnnEnter('A')}
          onMouseLeave={() => handleAnnLeave('A')}
        >
          <div>THE RIGHT PLAN</div>
          <div>FOR YOUR FAMILY</div>
          <div className="font-bold">IN 3 MINUTES</div>
        </div>

        <div
          className="hidden md:block ann-label ann-label-D absolute left-[72%] md:left-[79%] top-[80%] font-space-mono text-[7px] md:text-[9px] text-[#1E5B3B] leading-tight max-w-[90px] md:max-w-[160px] pointer-events-auto cursor-pointer select-none z-10"
          onMouseEnter={() => handleAnnEnter('D')}
          onMouseLeave={() => handleAnnLeave('D')}
        >
          <div>NO PAPERWORK.</div>
          <div>NO CONFUSION.</div>
          <div className="font-bold">JUST COVERAGE.</div>
        </div>

        <div
          className="hidden md:block ann-label ann-label-E absolute left-[50%] top-[83%] -translate-x-1/2 font-space-mono text-[7px] md:text-[9px] text-[#1E5B3B] text-center leading-tight max-w-[120px] md:max-w-none pointer-events-auto cursor-pointer select-none z-10"
          onMouseEnter={() => handleAnnEnter('E')}
          onMouseLeave={() => handleAnnLeave('E')}
        >
          <div>YOUR HEALTH DATA</div>
          <div>NEVER LEAVES</div>
          <div className="font-bold">YOUR PHONE</div>
        </div>

        <div className="absolute bottom-[8%] md:bottom-8 left-6 z-10 select-none">
          <div className="font-space-mono text-[10px] md:text-[11px] text-sutera-black mb-2 tracking-wider font-bold">
            [ HOW IT WORKS ]
          </div>
          <div className="flex flex-col gap-1">
            {CORE_FEATURES.map((item, idx) => (
              <div
                key={idx}
                className="feature-item flex items-center font-space-mono text-[10px] md:text-[11px] tracking-wider whitespace-nowrap pointer-events-auto cursor-pointer"
                onMouseEnter={() => handleFeatureEnter(idx)}
                onMouseLeave={() => handleFeatureLeave(idx)}
              >
                <span className="text-sutera-grey">{item.num}</span>
                <span
                  className={`feature-slashes feature-slashes-${idx} text-sutera-light-grey mx-1.5 font-light`}
                >
                  /////////
                </span>
                <span
                  className={`feature-label feature-label-${idx} text-sutera-black font-medium inline-block`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {panelOpen ? (
          <div
            className="info-panel absolute bottom-8 right-6 w-[200px] md:w-[220px] bg-pure-white border border-sutera-black p-4 z-10 select-none shadow-sm transition-all duration-300 pointer-events-auto"
            onMouseEnter={handlePanelEnter}
            onMouseLeave={handlePanelLeave}
          >
            <div className="relative">
              <button
                onClick={() => setPanelOpen(false)}
                className="absolute -top-1.5 -right-1 text-[11px] text-sutera-grey hover:text-sutera-black cursor-pointer font-space-mono font-bold"
              >
                ×
              </button>
              <div className="flex justify-between items-center border-b border-sutera-black pb-2 mb-2.5 font-space-mono text-[11px]">
                <span className="font-bold text-sutera-black">OUTSURANCE</span>
                <span className="text-sutera-grey">/AI</span>
              </div>
              <div className="font-space-mono text-[10px] space-y-1 text-sutera-black leading-tight">
                <div>OUT (OUTSTANDING)</div>
                <div>+ SURANCE</div>
                <div className="text-sutera-grey">(ASSURANCE)</div>
                <div className="h-2" />
                <div className="text-sutera-black font-bold">
                  → SMART INSURANCE
                </div>
                <div className="pl-3 text-sutera-black font-bold">
                  FOR EVERY FAMILY
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-sutera-black flex flex-col gap-2">
                <button
                  onClick={() => router.push('/register')}
                  className="w-full bg-sutera-black text-pure-white hover:bg-neutral-800 font-space-mono text-[10px] py-2 transition-colors uppercase tracking-widest text-center cursor-pointer font-bold"
                >
                  [ GET STARTED ]
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full border border-sutera-black text-sutera-black hover:bg-sutera-black hover:text-pure-white font-space-mono text-[10px] py-2 transition-colors uppercase tracking-widest text-center cursor-pointer font-medium"
                >
                  [ MEMBER PORTAL ]
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setPanelOpen(true)}
            className="info-panel absolute bottom-8 right-6 bg-pure-white border border-sutera-black px-3 py-1.5 z-10 font-space-mono text-[10px] text-sutera-black hover:bg-sutera-light-grey transition-colors cursor-pointer font-bold"
            onMouseEnter={handlePanelEnter}
            onMouseLeave={handlePanelLeave}
          >
            + SYSTEM INFO
          </button>
        )}

        <div className="scroll-arrow absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1.5 font-space-mono text-[9px] tracking-[0.15em] text-sutera-grey z-10 pointer-events-none select-none">
          <svg
            width="12"
            height="40"
            viewBox="0 0 12 40"
            className="pointer-events-none"
          >
            <line
              x1="6"
              y1="0"
              x2="6"
              y2="32"
              className="stroke-sutera-black"
              strokeWidth="1"
            />
            <polyline
              points="1,27 6,33 11,27"
              fill="none"
              className="stroke-sutera-black"
              strokeWidth="1"
            />
          </svg>
        </div>

        {crossClasses.map((posClass, idx) => (
          <div
            key={idx}
            className={`cross-marker absolute pointer-events-none z-10 ${posClass}`}
          >
            <svg
              className="w-3 h-3 text-sutera-light-grey"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <line x1="6" y1="0" x2="6" y2="12" />
              <line x1="0" y1="6" x2="12" y2="6" />
            </svg>
          </div>
        ))}
      </div>

      {/* SECTION 2 — HOW IT WORKS */}
      <div className="sec2-container min-h-screen w-screen bg-sutera-bg relative overflow-hidden py-28 px-6 sm:px-12 md:px-20 flex flex-col justify-center select-none z-0 border-t border-black/5">
        
        {/* Ghost section title */}
        <div className="sec2-ghost-num absolute left-[6%] top-[30%] font-space-mono text-[180px] md:text-[250px] font-black text-black/[0.03] select-none pointer-events-none -z-10 leading-none">
          02
        </div>

        <div className="max-w-[1200px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
          
          {/* Diagonal steps list */}
          <div className="lg:col-span-7 flex flex-col gap-16 lg:gap-20 relative min-h-[550px]">
            
            {/* Dashed curved connector line (SVG) */}
            <svg className="absolute inset-0 pointer-events-none hidden lg:block -z-10 w-full h-full" viewBox="0 0 700 550">
              <motion.path
                d="M 120,80 Q 250,220 380,360 T 500,480"
                fill="none"
                stroke="#CCCCCC"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
              <polygon points="497,472 500,480 492,477" fill="#CCCCCC" />
            </svg>

            {stepsData.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: step.delay }}
                className={`flex flex-col w-full max-w-[340px] bg-white/40 hover:bg-white/80 p-6 border border-black/[0.04] transition-colors duration-300 rounded-lg ${step.position}`}
              >
                <div className="font-space-mono text-[11px] text-neutral-400 tracking-widest uppercase mb-1">{step.num}</div>
                <h3 className="font-sans font-black text-[38px] md:text-[44px] leading-[1.05] text-neutral-900 tracking-tighter uppercase">
                  {step.tagline}
                  <span className="font-serif italic font-normal text-[#1E5B3B] block lowercase tracking-normal pl-1">{step.highlight}</span>
                </h3>
                <p className="font-sans text-[14px] text-neutral-500 max-w-[260px] mt-3 leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Floating lab report printed flat lay photo */}
          <div className="lg:col-span-5 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[340px] aspect-[3/4] overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.08)] bg-neutral-100 relative group border border-black/5"
            >
              <img
                src="/img_section2.png"
                alt="Printed Lab Report Flat Lay"
                className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-700"
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* SECTION 3 — WHAT YOU GET (Locked normal scroll horizontal pin) */}
      <div className="sec3-scroll-container relative bg-sutera-bg z-0 border-t border-black/5">
        
        {/* Sticky viewport container */}
        <div className="h-screen w-screen overflow-hidden flex flex-col justify-center relative">
          
          {/* Ghost section title */}
          <div className="absolute right-[8%] top-[12%] font-space-mono text-[180px] md:text-[240px] font-black text-black/[0.03] select-none pointer-events-none -z-10 leading-none">
            03
          </div>

          {/* Header Block */}
          <div className="max-w-[1200px] w-full mx-auto px-6 sm:px-12 md:px-20 mb-8 select-none">
            <span className="font-space-mono text-[11px] text-neutral-400 uppercase tracking-widest block mb-2">WHAT YOU GET</span>
            <h2 className="font-sans font-black text-4xl md:text-6xl text-neutral-900 tracking-tight leading-none uppercase">
              Plans that <span className="font-serif italic font-normal text-[#1E5B3B] block md:inline lowercase tracking-normal pl-1">actually fit you.</span>
            </h2>
          </div>

          {/* Horizontal plan cards track wrapper */}
          <div className="w-full overflow-hidden flex items-center">
            <div className="sec3-track flex gap-8 px-6 sm:px-12 md:px-20 w-max">
              {plansData.map((card, idx) => (
                <div
                  key={idx}
                  className={`w-[360px] flex-shrink-0 border border-black/[0.06] rounded-[12px] p-8 shadow-sm flex flex-col justify-between relative min-h-[460px] select-none ${card.bg}`}
                >
                  <div className="absolute top-6 right-8 font-space-mono text-[80px] font-black text-black/[0.03] select-none pointer-events-none -z-5 leading-none">
                    {card.num}
                  </div>

                  <div>
                    <div className="font-space-mono text-[10px] text-neutral-400 tracking-widest uppercase mb-1">{card.category}</div>
                    <h3 className="font-sans font-black text-2xl text-neutral-900 leading-tight uppercase">{card.name}</h3>

                    {/* Dotted leader facts table */}
                    <div className="space-y-2.5 mt-6">
                      <div className="flex justify-between items-baseline font-space-mono text-[11px] tracking-wider text-neutral-500 uppercase">
                        <span>Coverage</span>
                        <span className="flex-grow border-b border-dotted border-neutral-300 mx-2"></span>
                        <span className="text-black font-bold">{card.coverage}</span>
                      </div>
                      <div className="flex justify-between items-baseline font-space-mono text-[11px] tracking-wider text-neutral-500 uppercase">
                        <span>Premium</span>
                        <span className="flex-grow border-b border-dotted border-neutral-300 mx-2"></span>
                        <span className="text-black font-bold">{card.premium}</span>
                      </div>
                      <div className="flex justify-between items-baseline font-space-mono text-[11px] tracking-wider text-neutral-500 uppercase">
                        <span>Diabetes</span>
                        <span className="flex-grow border-b border-dotted border-neutral-300 mx-2"></span>
                        <span className="text-[#1E5B3B] font-bold">{card.diabetes}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="font-space-mono text-[9px] uppercase tracking-widest text-neutral-400 mt-6 block">WHY IT WORKS:</div>
                    <p className="font-sans text-[13.5px] leading-relaxed text-neutral-600 mt-1 max-w-[280px]">{card.why}</p>
                    
                    <div className="flex justify-between items-center mt-6">
                      <div className="bg-[#EBF5EF] px-3 py-1 rounded-full text-[#1E5B3B] font-bold text-[12px] inline-flex items-center gap-1.5 border border-[#1E5B3B]/10">
                        <span className="text-[10px]">★</span> {card.score}
                      </div>
                      <button
                        onClick={() => router.push('/explorer')}
                        className="font-space-mono text-[11px] text-[#1E5B3B] font-bold tracking-wider hover:opacity-80 transition-opacity uppercase cursor-pointer"
                      >
                        Explore Plan →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 — REAL FAMILIES */}
      <div ref={sec4Ref} className="sec4-container relative min-h-screen w-screen flex flex-col md:flex-row bg-sutera-bg z-0 border-t border-black/5">
        
        {/* Left Column (Sticky Cinematic Image) */}
        <div className="w-full md:w-1/2 h-[50vh] md:h-screen md:sticky md:top-0 overflow-hidden relative select-none border-r border-black/5">
          <motion.img
            src="/img_section4.png"
            alt="Indian Family Cinematic Golden Light"
            className="sec4-image-parallax w-full h-full object-cover absolute inset-0 scale-[1.15] transform-gpu"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
        </div>

        {/* Right Column (Scrollable Stacked Testimonials) */}
        <div className="w-full md:w-1/2 px-6 sm:px-12 md:px-20 py-24 flex flex-col justify-center relative select-none">
          <div className="absolute left-6 top-16 md:top-24 font-space-mono text-[160px] font-black text-black/[0.02] select-none pointer-events-none -z-10 leading-none">
            04
          </div>
          
          <div className="mb-12">
            <span className="font-space-mono text-[11px] text-neutral-400 uppercase tracking-widest block mb-2">REAL FAMILIES</span>
            <h2 className="font-sans font-black text-4xl md:text-5xl text-neutral-900 tracking-tight leading-none uppercase">
              Trusted by <span className="font-serif italic font-normal text-[#1E5B3B] block md:inline lowercase tracking-normal pl-1">thousands.</span>
            </h2>
          </div>

          <div className="space-y-6 max-w-[420px]">
            {testimonialsData.map((t, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-[12px] p-8 border border-black/[0.05] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300"
              >
                <p className="font-sans font-medium text-neutral-900 text-[16px] sm:text-[18px] leading-relaxed mb-5">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="w-full h-[1px] bg-neutral-100 mb-4" />
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-sans font-semibold text-[14px] text-neutral-900">{t.name}</h4>
                    <p className="font-sans text-[12px] text-neutral-400">{t.detail}</p>
                  </div>
                  <div className="flex gap-0.5 text-[11px] text-[#1E5B3B]">
                    {"★★★★★"}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 5 — GET PROTECTED TODAY */}
      <div className="sec5-anchor w-screen bg-sutera-bg py-20 px-6 sm:px-12 select-none z-0 border-t border-black/5 flex justify-center items-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[1140px] bg-[#1E5B3B] text-white rounded-[24px] py-24 px-6 md:px-16 shadow-[0_30px_70px_rgba(30,91,59,0.18)] relative overflow-hidden flex flex-col justify-center items-center text-center border border-white/5"
        >
          {/* Decorative glowing gradient radial spot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#2e8c56] rounded-full blur-[120px] opacity-35 pointer-events-none -z-20" />

          {/* Topographic organic background vector lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10 animate-pulse duration-[8s]" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M-10,30 Q 30,10 70,50 T 110,80" fill="none" stroke="currentColor" className="text-white opacity-[0.06]" strokeWidth="0.15" />
            <path d="M-10,50 Q 20,40 60,70 T 110,95" fill="none" stroke="currentColor" className="text-white opacity-[0.06]" strokeWidth="0.1" />
            <path d="M-10,70 Q 40,80 80,60 T 110,110" fill="none" stroke="currentColor" className="text-white opacity-[0.06]" strokeWidth="0.2" />
          </svg>

          <div className="max-w-[750px] w-full text-center flex flex-col items-center z-10 font-sans">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 0.6, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-space-mono text-[11px] text-white tracking-widest uppercase mb-4 block"
            >
              READY?
            </motion.span>
            
            <h2 className="font-sans font-black text-5xl md:text-8xl tracking-tight uppercase leading-[0.9] text-white overflow-hidden">
              <motion.span
                initial={{ y: 80, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block"
              >
                Stop worrying.
              </motion.span>
              <motion.span
                initial={{ y: 80, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="font-serif italic font-normal text-white/95 block lowercase tracking-normal mt-2"
              >
                Start protecting.
              </motion.span>
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 0.7, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="font-sans text-white/80 text-base md:text-lg max-w-[480px] text-center mt-6 leading-relaxed"
            >
              Upload your lab report. Get matched in minutes. No calls. No confusion. No paperwork.
            </motion.p>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 mt-10 w-full justify-center px-4"
            >
              <button
                onClick={() => router.push('/register')}
                className="bg-white text-[#1E5B3B] hover:bg-[#EBF5EF] h-14 px-10 rounded-[4px] font-sans font-bold text-[14px] uppercase tracking-wider transition-all duration-300 scale-100 hover:scale-[1.02] cursor-pointer shadow-md"
              >
                Get Protected Free →
              </button>
              <button
                onClick={() => router.push('/login')}
                className="bg-transparent text-white border border-white/40 hover:border-white h-14 px-10 rounded-[4px] font-sans font-bold text-[14px] uppercase tracking-wider transition-all duration-300 scale-100 hover:scale-[1.02] cursor-pointer"
              >
                See How It Works
              </button>
            </motion.div>

            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.5 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="font-space-mono text-[11px] text-white tracking-widest uppercase mt-6 block"
            >
              No credit card required. Free to start.
            </motion.span>
          </div>
        </motion.div>
      </div>

      {/* FOOTER */}
      <footer className="bg-sutera-bg text-black pt-32 pb-16 px-8 sm:px-16 md:px-24 select-none relative z-0 border-t border-black/5">
        
        <div className="max-w-[1200px] w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-12 pb-24 border-b border-black/[0.08]">
          
          {/* Column 1 — Brand */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 flex flex-col gap-6"
          >
            <div className="flex items-center gap-1 select-none cursor-pointer" onClick={() => router.push('/')}>
              <img src="/fidsurance-logo.png" alt="Outsurance Logo" className="h-9 w-auto object-contain" />
              <span className="font-space-mono text-[14px] tracking-[0.05em] text-black font-bold uppercase select-none leading-none -ml-1">
                OUTSURANCE
              </span>
            </div>
            <p className="text-[13.5px] text-neutral-500 font-sans tracking-wide max-w-[260px] leading-relaxed">
              Protection. Care. Peace of Mind. Built around state-of-the-art diagnostic assessment pipelines.
            </p>
            <div className="flex gap-3 mt-2">
              {['L', 'T', 'I'].map((icon, idx) => (
                <motion.div
                  whileHover={{ scale: 1.1, borderColor: '#1E5B3B', color: '#1E5B3B' }}
                  key={idx}
                  className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-neutral-600 transition-colors duration-200 cursor-pointer font-space-mono text-xs font-bold"
                >
                  {icon}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Column 2 — Product */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="lg:col-span-3 border-l border-black/[0.05] pl-0 md:pl-8"
          >
            <span className="font-space-mono text-[10px] tracking-widest text-neutral-400 uppercase mb-5 block font-bold">PRODUCT</span>
            <ul className="space-y-4 font-sans text-[14px] text-neutral-600">
              {["How It Works", "Find a Plan", "Compare Plans", "Risk Assessment", "Stress Test"].map((item, idx) => (
                <li key={idx} className="overflow-hidden">
                  <motion.button
                    whileHover={{ x: 4, color: '#1E5B3B' }}
                    onClick={() => router.push('/explorer')}
                    className="hover:text-[#1E5B3B] transition-all text-left cursor-pointer font-medium"
                  >
                    {item}
                  </motion.button>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Column 3 — Company */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="lg:col-span-2 border-l border-black/[0.05] pl-0 md:pl-8"
          >
            <span className="font-space-mono text-[10px] tracking-widest text-neutral-400 uppercase mb-5 block font-bold">COMPANY</span>
            <ul className="space-y-4 font-sans text-[14px] text-neutral-600">
              {["About Us", "Privacy Policy", "Terms of Service", "Contact Us", "Careers"].map((item, idx) => (
                <li key={idx} className="overflow-hidden">
                  <motion.button
                    whileHover={{ x: 4, color: '#1E5B3B' }}
                    onClick={() => router.push('/')}
                    className="hover:text-[#1E5B3B] transition-all text-left cursor-pointer font-medium"
                  >
                    {item}
                  </motion.button>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Column 4 — Contact */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="lg:col-span-3 border-l border-black/[0.05] pl-0 md:pl-8 flex flex-col gap-5"
          >
            <div>
              <span className="font-space-mono text-[10px] tracking-widest text-neutral-400 uppercase mb-3 block font-bold">GET IN TOUCH</span>
              <p className="font-sans text-[14px] text-neutral-600 leading-relaxed font-medium">
                hello@outsurance.com<br />
                +91 000 000 0000
              </p>
            </div>
            <div>
              <button
                onClick={() => router.push('/register')}
                className="bg-[#1E5B3B] hover:bg-[#256c45] text-white font-space-mono font-bold uppercase tracking-wider text-[11px] px-7 py-3.5 rounded-[4px] transition-colors cursor-pointer shadow-sm hover:shadow-md"
              >
                Start Free →
              </button>
            </div>
          </motion.div>
        </div>

        {/* Giant Watermark Animated Brand Name */}
        <div className="overflow-hidden py-12 select-none">
          <motion.h1
            initial={{ y: "110%", opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-sans font-black text-[13.5vw] tracking-tighter text-black/[0.04] text-center uppercase leading-none font-extrabold select-none pointer-events-none"
          >
            OUTSURANCE
          </motion.h1>
        </div>

        {/* BOTTOM ROW */}
        <div className="max-w-[1200px] w-full mx-auto flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-black/[0.05] font-space-mono text-[11px] text-neutral-400 gap-4 text-center sm:text-left">
          <span>&copy; 2024 Outsurance. All rights reserved.</span>
          <span>Made in India 🇮🇳</span>
        </div>
      </footer>
    </div>
  );
}
