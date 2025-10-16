import type { APIRoute } from 'astro';
import timeline from '../../data/timeline.json';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const GET: APIRoute = ({ params, request }) => {
  const items = (timeline as any[]);
  
  // Sort by date descending (newest first)
  const sorted = [...items].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Try to preserve generated_at timestamp if content hasn't changed
  let generatedAt = new Date().toISOString();
  
  try {
    // Check if previously deployed file exists
    const docsPath = join(process.cwd(), '..', 'docs', 'api', 'timeline.json');
    if (existsSync(docsPath)) {
      const oldData = JSON.parse(readFileSync(docsPath, 'utf-8'));
      
      // Compare data excluding generated_at
      const oldItems = JSON.stringify(oldData.items);
      const newItems = JSON.stringify(sorted);
      
      if (oldItems === newItems && 
          oldData.meta?.total_items === sorted.length) {
        // Data hasn't changed, preserve the old timestamp
        generatedAt = oldData.meta.generated_at;
      }
    }
  } catch (e) {
    // If reading fails, just use new timestamp
  }

  return new Response(
    JSON.stringify({
      meta: {
        title: "Chase Pettet's Timeline",
        description: "A timeline of my public online activity",
        site: "https://timeline.523.life",
        total_items: sorted.length,
        generated_at: generatedAt,
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

