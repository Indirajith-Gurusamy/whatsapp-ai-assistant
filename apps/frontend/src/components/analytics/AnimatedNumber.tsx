'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    className?: string;
}

export function AnimatedNumber({ value, duration = 800, className }: AnimatedNumberProps) {
    const [display, setDisplay] = useState(0);
    const prevValueRef = useRef(0);

    useEffect(() => {
        const from = prevValueRef.current;
        let startTime: number | null = null;
        let frameId: number;

        const animate = (timestamp: number) => {
            if (startTime === null) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(from + (value - from) * eased));

            if (progress < 1) {
                frameId = requestAnimationFrame(animate);
            } else {
                prevValueRef.current = value;
            }
        };

        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [value, duration]);

    return <span className={className}>{display.toLocaleString()}</span>;
}
