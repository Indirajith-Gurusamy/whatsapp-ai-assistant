export type ChannelFilter = 'all' | 'whatsapp' | 'email';

export function channelQueryParam(filter: ChannelFilter): string | undefined {
    if (filter === 'all') return undefined;
    return filter;
}
