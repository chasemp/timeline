import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import timeline from '../data/timeline.json';

export async function GET(context: APIContext) {
  const items = (timeline as any[]);
  
  // Sort by date descending (newest first)
  const sorted = [...items].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Map type to friendly display name
  const typeDisplayName = (type: string) => {
    const names: Record<string, string> = {
      'saved': 'Article Shared',
      'primer': 'AI Topic Primer',
      'blog': 'Blog Post',
      'bluesky': 'Bluesky',
      'release': 'GitHub Release',
      'wikipedia': 'Wikipedia Edit'
    };
    return names[type] || type;
  };

  return rss({
    title: "Chase Pettet's Timeline",
    description: 'A timeline of my public online activity featuring blog posts, saved articles, and social media.',
    site: context.site?.toString() || 'https://timeline.523.life',
    items: sorted.map((item) => {
      const itemType = typeDisplayName(item.type);
      
      // For blog posts, create full URL to the blog post page
      const link = item.type === 'blog' 
        ? `https://timeline.523.life/blog/${item.id.replace('blog:', '')}`
        : item.url || 'https://timeline.523.life';

      // Create description with type prefix
      let description = item.summary || '';
      if (item.content_html) {
        // Strip HTML tags for RSS description, keep first 200 chars
        const text = item.content_html.replace(/<[^>]*>/g, '').substring(0, 200);
        description = text + (text.length === 200 ? '...' : '');
      }

      return {
        title: `[${itemType}] ${item.title}`,
        link,
        description,
        pubDate: new Date(item.timestamp),
        categories: [item.type, itemType],
        customData: item.author ? `<author>${item.author}</author>` : '',
      };
    }),
    customData: `<language>en-us</language>`,
  });
}


