export function parseEmailContent(content: string): { subject: string; body: string } {
    const match = content.match(/^Subject:\s*(.+?)(?:\r?\n\r?\n|\r?\n)/);
    if (match) {
        return {
            subject: match[1].trim() || '(No subject)',
            body: content.slice(match[0].length).trim(),
        };
    }
    return { subject: '(No subject)', body: content.trim() };
}

/** Skip markdown table separator rows like |---|---| */
function isTableSeparator(line: string): boolean {
    return /^\|[\s:|-]+\|$/.test(line.trim());
}

/** Format a markdown table row as readable inline text */
function formatTableRow(line: string): string {
    const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
    return cells.join(' · ');
}

export type EmailBodySegment =
    | { type: 'text'; value: string }
    | { type: 'link'; label: string; href: string };

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/;
const URL_RE = /(https?:\/\/[^\s<>"']+)/;
const SAFE_HREF_RE = /^(https?:\/\/|mailto:)/i;

function sanitizeHref(href: string): string | null {
    const trimmed = href.trim();
    if (!SAFE_HREF_RE.test(trimmed)) return null;
    return trimmed;
}

function pushText(segments: EmailBodySegment[], value: string) {
    if (!value) return;
    const last = segments[segments.length - 1];
    if (last?.type === 'text') {
        last.value += value;
    } else {
        segments.push({ type: 'text', value });
    }
}

/** Split a line into text and link segments for safe rendering */
export function parseEmailLineSegments(line: string): EmailBodySegment[] {
    const segments: EmailBodySegment[] = [];
    let cursor = 0;

    while (cursor < line.length) {
        const rest = line.slice(cursor);
        const mdMatch = rest.match(MARKDOWN_LINK_RE);
        const urlMatch = rest.match(URL_RE);
        const mdIndex = mdMatch?.index ?? -1;
        const urlIndex = urlMatch?.index ?? -1;

        let nextMatch: RegExpMatchArray | null = null;
        if (mdIndex >= 0 && (urlIndex < 0 || mdIndex <= urlIndex)) {
            nextMatch = mdMatch;
        } else if (urlIndex >= 0) {
            nextMatch = urlMatch;
        }

        if (!nextMatch || nextMatch.index === undefined) {
            pushText(segments, line.slice(cursor));
            break;
        }

        pushText(segments, line.slice(cursor, cursor + nextMatch.index));
        if (nextMatch[0].startsWith('[')) {
            const href = sanitizeHref(nextMatch[2]);
            if (href) {
                segments.push({ type: 'link', label: nextMatch[1], href });
            } else {
                pushText(segments, nextMatch[0]);
            }
        } else {
            const href = sanitizeHref(nextMatch[0]);
            if (href) {
                segments.push({ type: 'link', label: nextMatch[0], href });
            } else {
                pushText(segments, nextMatch[0]);
            }
        }
        cursor += nextMatch.index + nextMatch[0].length;
    }

    return segments.length ? segments : [{ type: 'text', value: line }];
}

export type EmailBodyLine =
    | { kind: 'blank' }
    | { kind: 'table'; text: string }
    | { kind: 'text'; segments: EmailBodySegment[] };

export function parseEmailBodyLines(body: string): EmailBodyLine[] {
    return body.split('\n').map((raw) => {
        const line = raw.replace(/\r$/, '');
        if (!line.trim()) return { kind: 'blank' as const };
        if (isTableSeparator(line)) return { kind: 'blank' as const };
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            return { kind: 'table' as const, text: formatTableRow(line) };
        }
        return { kind: 'text' as const, segments: parseEmailLineSegments(line) };
    });
}
