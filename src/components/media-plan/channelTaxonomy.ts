export interface ChannelGroup {
  group: string;
  channels: string[];
}

export const DEFAULT_CHANNEL_TAXONOMY: ChannelGroup[] = [
  {
    group: 'Paid Digital',
    channels: [
      'Meta Ads', 'Instagram Ads', 'Facebook Ads', 'Messenger Ads',
      'Google Search', 'Google Display', 'YouTube Ads', 'Demand Gen',
      'Performance Max', 'Gmail Ads', 'TikTok Ads', 'LinkedIn Ads',
      'X Ads', 'Pinterest Ads', 'Programmatic Display', 'Native Ads', 'Spotify Ads',
    ],
  },
  {
    group: 'Organic / Owned',
    channels: [
      'Facebook Organic', 'Instagram Organic', 'LinkedIn Organic',
      'TikTok Organic', 'YouTube Organic', 'Blog / Articles',
      'SEO Content', 'Website Landing Page', 'Microsite',
      'Newsletter', 'Email Automation', 'Push Notifications', 'SMS / Viber',
    ],
  },
  {
    group: 'PR / Earned',
    channels: [
      'Press Release', 'Media Outreach', 'Interviews', 'Publications',
      'Influencer Collaborations', 'Partnerships', 'Community Activations',
    ],
  },
  {
    group: 'Offline / Hybrid',
    channels: [
      'Event', 'Expo / Booth', 'OOH', 'Print', 'Radio', 'TV',
      'In-store Promotion', 'POS Materials', 'Sampling', 'Roadshow',
    ],
  },
  {
    group: 'Internal / CRM / Retention',
    channels: [
      'CRM Campaign', 'Retargeting', 'Loyalty Campaign',
      'Win-back', 'Existing Customer Offer', 'Lead Nurturing',
    ],
  },
];

export function getAllChannels(): string[] {
  return DEFAULT_CHANNEL_TAXONOMY.flatMap(g => g.channels);
}

export function getChannelGroup(channelName: string): string | undefined {
  return DEFAULT_CHANNEL_TAXONOMY.find(g => g.channels.includes(channelName))?.group;
}

export function getGroupedChannelOptions(): { label: string; options: { value: string; label: string }[] }[] {
  return DEFAULT_CHANNEL_TAXONOMY.map(g => ({
    label: g.group,
    options: g.channels.map(ch => ({ value: ch, label: ch })),
  }));
}

/** Infer a task bundle template key from channel name */
export function inferBundleTemplate(channel: string): string | null {
  const lower = channel.toLowerCase();
  if (lower.includes('newsletter') || lower.includes('email')) return 'Newsletter';
  if (lower.includes('ads') || lower.includes('google') || lower.includes('programmatic') || lower.includes('performance max') || lower.includes('demand gen') || lower.includes('native')) return 'Paid Media';
  if (lower.includes('organic') || lower.includes('social') || lower.includes('tiktok organic') || lower.includes('blog')) return 'Social Media';
  if (lower.includes('event') || lower.includes('expo') || lower.includes('roadshow')) return 'Event';
  if (lower.includes('press') || lower.includes('media outreach') || lower.includes('influencer') || lower.includes('pr')) return 'PR';
  if (lower.includes('seo')) return 'SEO';
  return null;
}
