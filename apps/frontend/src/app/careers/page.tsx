'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { careersApi, type CareersSettings } from '@/lib/recruitment';
import { ArrowRight, Briefcase } from 'lucide-react';

const HERO_VIDEO_URL =
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204221_5339e40b-e73d-4ab0-9c65-79c18c66fd50.mp4';

export default function CareersPage() {
    const [settings, setSettings] = useState<CareersSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const s = await careersApi.settings();
                if (cancelled) return;
                setSettings(s);
            } catch {
                if (!cancelled) setError('Could not load careers page right now. Please try again later.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="relative h-screen w-full overflow-hidden bg-black">
                <div className="h-full w-full animate-pulse bg-black" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black px-6">
                <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
                    <p className="text-sm text-white/70">{error}</p>
                </div>
            </div>
        );
    }

    if (settings && !settings.enabled) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black px-6">
                <div className="rounded-lg border border-white/10 bg-white/5 p-10 text-center backdrop-blur">
                    <Briefcase className="mx-auto h-10 w-10 text-white/50" />
                    <h1 className="mt-3 text-xl font-bold text-white">Applications are currently closed</h1>
                    <p className="mt-1 text-sm text-white/60">
                        We are not accepting applications right now. Please check back soon.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-screen w-full overflow-hidden bg-black font-geist text-white antialiased">
            <video
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: '70% center' }}
                src={HERO_VIDEO_URL}
                autoPlay
                muted
                loop
                playsInline
            />
            <div className="absolute inset-0 bg-black/20" />

            <div className="relative flex h-[calc(100vh-80px)] flex-col justify-between px-6 pb-8 pt-8 sm:pb-10 sm:pt-10 md:px-12 lg:px-16">
                <div>
                    <div className="mb-5 flex items-center sm:mb-6">
                        {settings?.company_logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={settings.company_logo_url}
                                alt={`${settings.company_name} logo`}
                                className="h-36 w-36 rounded object-contain sm:h-40 sm:w-40"
                            />
                        ) : (
                            <div className="flex h-36 w-36 items-center justify-center rounded-lg bg-white text-black sm:h-40 sm:w-40">
                                <Briefcase className="h-14 w-14" />
                            </div>
                        )}
                    </div>

                    <div className="max-w-3xl">
                        <h1 className="text-xl font-medium leading-[1.1] tracking-tight text-white sm:text-3xl md:text-4xl lg:text-4xl animate-[fadeSlideUp_0.8s_ease_0.4s_both]">
                            {settings?.about_message || `Join ${settings?.company_name || 'us'}`}
                        </h1>
                    </div>
                </div>

                <div>
                    <p className="mb-5 max-w-sm text-sm leading-relaxed text-white/60 sm:mb-6 sm:max-w-lg sm:text-base md:text-lg animate-[fadeSlideUp_0.8s_ease_0.7s_both]">
                        Explore open roles and apply in just a couple of minutes.
                    </p>
                    <Link
                        href="/careers/jobs"
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-transform hover:scale-105 sm:px-6 sm:py-3 animate-[fadeSlideUp_0.8s_ease_0.9s_both]"
                    >
                        View openings <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}