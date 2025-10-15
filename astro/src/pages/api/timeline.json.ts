import type { APIRoute } from 'astro';
import timeline from '../../data/timeline.json';

export const GET: APIRoute = ({ params, request }) => {
  const items = (timeline as any[]);
  
  // Sort by date descending (newest first)
  const sorted = [...items].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return new Response(
    JSON.stringify({
      meta: {
        title: "Chase Pettet's Timeline",
        description: "A timeline of my public online activity",
        site: "https://timeline.523.life",
        total_items: sorted.length,
        generated_at: new Date().toISOString(),
        types: [...new Set(sorted.map(i => i.type))],
      },
      items: sorted
    }, null, 2),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*", // Allow CORS
      }
    }
  );
};

