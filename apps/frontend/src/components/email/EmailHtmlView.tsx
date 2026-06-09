'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

function wrapEmailDocument(html: string): string {
    const hasDocument = /<html[\s>]/i.test(html);
    if (hasDocument) {
        return html;
    }
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <base target="_blank" rel="noopener noreferrer" />
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #202124;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; }
    a { color: #1a73e8; }
  </style>
</head>
<body>${html}</body>
</html>`;
}

interface EmailHtmlViewProps {
    html: string;
    className?: string;
}

export function EmailHtmlView({ html, className }: EmailHtmlViewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const srcDoc = useMemo(() => wrapEmailDocument(html), [html]);

    const resizeIframe = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc?.body) return;
        const height = Math.max(
            doc.body.scrollHeight,
            doc.documentElement?.scrollHeight ?? 0
        );
        iframe.style.height = `${height + 16}px`;
    }, []);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        iframe.addEventListener('load', resizeIframe);
        return () => iframe.removeEventListener('load', resizeIframe);
    }, [srcDoc, resizeIframe]);

    return (
        <iframe
            ref={iframeRef}
            sandbox=""
            srcDoc={srcDoc}
            title="Email content"
            className={cn('w-full min-h-[120px] border-0 bg-white', className)}
        />
    );
}
