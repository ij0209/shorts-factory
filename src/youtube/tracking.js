const TRACKED_HOST = 'https://wemakevoice.com';

export function trackingUrlForContent(content) {
  if ((content.youtubeChannel || 'wemakevoice') !== 'wemakevoice') return null;
  if (content.experimentId === 'wmv-round2-dual-track') {
    const pathname = content.contentTrack === 'creator_tts' ? '/freetts' : '/announcementsystem';
    const params = new URLSearchParams({
      utm_source: 'youtube', utm_medium: 'shorts',
      utm_campaign: 'wmv-round2-dual-track', utm_content: content.id,
    });
    return `https://www.wemakevoice.com${pathname}?${params}`;
  }
  const medium = content.id?.includes('longform') ? 'longform' : 'shorts';
  const category = content.contentTrack === 'creator_tts' ? 'creator_tts' : (content.category || content.industry || 'general');
  const slug = content.id || content.topic || 'youtube';
  const pathname = content.contentTrack === 'creator_tts' ? '/' : content.contentType === 'announcement' || category !== 'general'
    ? '/priceAnnounce'
    : '/';
  const params = new URLSearchParams({
    utm_source: 'youtube',
    utm_medium: medium,
    utm_campaign: category,
    utm_content: slug,
  });
  return `${TRACKED_HOST}${pathname}?${params}`;
}

export function descriptionWithTracking(content, description = '') {
  if (content.experimentId === 'wmv-round2-dual-track') return description;
  const url = trackingUrlForContent(content);
  if (!url) return description;
  const tracked = /https?:\/\/wemakevoice\.com\/[^\s]*\?[^\s]*utm_source=youtube[^\s]*/i;
  if (tracked.test(description)) return description.replace(tracked, url);
  const bare = /(?:https?:\/\/)?wemakevoice\.com(?:\/)?(?!\S)/i;
  if (bare.test(description)) return description.replace(bare, url);
  return `${description.trim()}\n\n${url}`;
}
