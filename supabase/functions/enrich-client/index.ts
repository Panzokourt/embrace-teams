import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Suggestion {
  field: string;
  label: string;
  value: any;
  currentValue?: any;
  confidence?: 'low' | 'medium' | 'high';
  source?: string;
  sourceUrl?: string;
}

const FIELD_LABELS: Record<string, string> = {
  tax_id: 'ΑΦΜ',
  name: 'Όνομα',
  contact_email: 'Email',
  contact_phone: 'Τηλέφωνο',
  secondary_phone: 'Δεύτερο Τηλέφωνο',
  address: 'Διεύθυνση',
  website: 'Website',
  sector: 'Τομέας',
  social_accounts: 'Social Media',
  notes: 'Περιγραφή',
  tags: 'Tags',
};

async function firecrawlCall(target: string, formats: any[]) {
  const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: target, formats, onlyMainContent: true }),
  });
  return r;
}

async function firecrawlScrape(url: string) {
  if (!FIRECRAWL_API_KEY) return null;
  const target = url.startsWith('http') ? url : `https://${url}`;
  try {
    // Request rawHtml too so we can extract favicon/og:image as logo fallback
    let r = await firecrawlCall(target, ['markdown', 'branding', 'links', 'rawHtml']);
    if (!r.ok) {
      const t = await r.text();
      console.error('Firecrawl error (with branding)', r.status, t);
      r = await firecrawlCall(target, ['markdown', 'rawHtml']);
      if (!r.ok) {
        const t2 = await r.text();
        console.error('Firecrawl error (markdown+raw)', r.status, t2);
        // Last resort: markdown only
        r = await firecrawlCall(target, ['markdown']);
        if (!r.ok) return null;
      }
    }
    return await r.json();
  } catch (e) {
    console.error('Firecrawl exception', e);
    return null;
  }
}

function extractLogoFromHtml(html: string, baseUrl: string): string | null {
  if (!html) return null;
  const absolutize = (href: string): string => {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  };
  // 1) og:image / twitter:image
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return absolutize(og[1]);

  // 2) <link rel="apple-touch-icon"> (usually high-res)
  const apple = html.match(/<link[^>]+rel=["'](?:apple-touch-icon[^"']*)["'][^>]+href=["']([^"']+)["']/i);
  if (apple?.[1]) return absolutize(apple[1]);

  // 3) Standard <link rel="icon">
  const icon = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
            || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
  if (icon?.[1]) return absolutize(icon[1]);

  return null;
}

function googleFaviconUrl(siteUrl: string): string | null {
  try {
    const u = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=256`;
  } catch {
    return null;
  }
}

async function perplexityLookup(query: string): Promise<{ content: string; citations: string[] } | null> {
  if (!PERPLEXITY_API_KEY) return null;
  try {
    const r = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You return concise, factual company information based on web search. Use Greek when applicable.' },
          { role: 'user', content: query },
        ],
      }),
    });
    if (!r.ok) {
      console.error('Perplexity error', r.status, await r.text());
      return null;
    }
    const data = await r.json();
    return {
      content: data?.choices?.[0]?.message?.content || '',
      citations: data?.citations || [],
    };
  } catch (e) {
    console.error('Perplexity exception', e);
    return null;
  }
}

async function aiExtract(context: string, currentClient: Record<string, any>) {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

  const tools = [{
    type: 'function',
    function: {
      name: 'extract_client_info',
      description: 'Extract structured business information about the client',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Official company name' },
          tax_id: { type: 'string', description: 'Greek ΑΦΜ / VAT number (digits only)' },
          contact_email: { type: 'string' },
          contact_phone: { type: 'string', description: 'Primary phone with country code' },
          secondary_phone: { type: 'string' },
          address: { type: 'string', description: 'Full street address' },
          website: { type: 'string' },
          sector: {
            type: 'string',
            enum: ['public', 'private', 'non_profit', 'government', 'mixed'],
          },
          notes: { type: 'string', description: 'Brief description of the company (1-2 sentences)' },
          tags: {
            type: 'array',
            description: '3-6 σύντομα tags (lowercase, ENGLISH preferred) που χαρακτηρίζουν την εταιρεία: industry/τομέας, business model (b2b/b2c/d2c), τύπος (startup, enterprise, agency, sme, public-sector, non-profit), κάθετη αγορά (fintech, saas, ecommerce, restaurant, healthcare, education κ.λπ.). Παράδειγμα: ["fintech","b2b","saas","startup"].',
            items: { type: 'string' },
          },
          social_accounts: {
            type: 'array',
            description: 'ΟΛΟΙ οι λογαριασμοί κοινωνικής δικτύωσης που μπορείς να επιβεβαιώσεις (Facebook, Instagram, LinkedIn, YouTube, TikTok, X/Twitter, Threads). Μην παραλείπεις πλατφόρμες που υπάρχουν. Το account_name πρέπει να είναι το handle/όνομα σελίδας (π.χ. "@nike", "Nike Greece") — αν δεν αναφέρεται ρητά, εξήγαγέ το από το URL.',
            items: {
              type: 'object',
              properties: {
                platform: { type: 'string', enum: ['facebook', 'instagram', 'twitter', 'x', 'linkedin', 'youtube', 'tiktok', 'threads'] },
                url: { type: 'string' },
                account_name: { type: 'string', description: 'Handle ή εμφανιζόμενο όνομα του λογαριασμού' },
              },
              required: ['platform', 'url', 'account_name'],
            },
          },
          confidence: {
            type: 'object',
            description: 'Confidence per field: low, medium, or high',
            additionalProperties: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
        },
      },
    },
  }];

  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `Extract verifiable business information from the provided context. Only include fields you can find evidence for. Output via the function tool. Confidence: high = directly stated; medium = inferred; low = uncertain. Greek company → Greek values where natural.

ALWAYS try to extract these high-value fields when any signal exists:
- tax_id (ΑΦΜ): Αν είναι ελληνική εταιρεία και βρεις 9ψήφιο ΑΦΜ, επέστρεψέ το (digits only).
- tags: 3-6 περιγραφικά keywords (industry, business model, vertical) — π.χ. ["fintech","b2b","saas"].
- social_accounts: ΟΛΕΣ τις πλατφόρμες (Facebook, Instagram, LinkedIn, YouTube, TikTok, X/Twitter, Threads) — όχι μόνο μία. Πάντα συμπλήρωσε account_name (handle ή όνομα σελίδας).`,
        },
        {
          role: 'user',
          content: `Current client data:\n${JSON.stringify(currentClient, null, 2)}\n\nContext from web scrape / search:\n${context.slice(0, 12000)}`,
        },
      ],
      tools,
      tool_choice: { type: 'function', function: { name: 'extract_client_info' } },
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    if (r.status === 429) throw new Error('Rate limited. Try again in a few seconds.');
    if (r.status === 402) throw new Error('AI credits exhausted. Add credits in Settings → Workspace → Usage.');
    throw new Error(`AI gateway error: ${text}`);
  }

  const data = await r.json();
  const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) return {};
  try {
    return JSON.parse(tc.function.arguments);
  } catch {
    return {};
  }
}

async function uploadLogo(supabase: any, logoUrl: string, clientId: string): Promise<string | null> {
  try {
    const r = await fetch(logoUrl, {
      headers: {
        // Some CDNs (incl. Google favicons) require a UA
        'User-Agent': 'Mozilla/5.0 (compatible; LovableEnrichBot/1.0)',
        'Accept': 'image/*,*/*;q=0.8',
      },
    });
    if (!r.ok) {
      console.error('Logo fetch failed', r.status, logoUrl);
      return null;
    }
    const ct = (r.headers.get('content-type') || 'image/png').toLowerCase();
    // Validate it's actually an image
    if (!ct.startsWith('image/') && !ct.includes('svg')) {
      console.error('Logo is not an image, content-type:', ct, logoUrl);
      return null;
    }
    const buf = await r.arrayBuffer();
    if (!buf || buf.byteLength < 100) {
      console.error('Logo too small/empty', buf?.byteLength, logoUrl);
      return null;
    }
    const ext = ct.includes('svg') ? 'svg'
              : ct.includes('jpeg') || ct.includes('jpg') ? 'jpg'
              : ct.includes('webp') ? 'webp'
              : ct.includes('gif') ? 'gif'
              : ct.includes('x-icon') || ct.includes('vnd.microsoft.icon') ? 'ico'
              : 'png';
    // Service role bypasses RLS, so the bucket policy first-segment rule does not apply here.
    // We keep a stable, namespaced path under the client id.
    const path = `client-logos/${clientId}.${ext}`;
    const { error } = await supabase.storage.from('project-files').upload(path, buf, {
      contentType: ct,
      upsert: true,
    });
    if (error) {
      console.error('Logo upload error', error);
      return null;
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from('project-files')
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signErr) {
      console.error('Logo signed URL error', signErr);
      return null;
    }
    return signed?.signedUrl || null;
  } catch (e) {
    console.error('uploadLogo exception', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { clientId, website, taxId, clientName, draft } = await req.json();
    const isDraft = !!draft || !clientId;

    // For non-draft requests we need a real client to write logos and update suggestions against.
    let client: any = null;
    if (!isDraft) {
      const { data, error: cErr } = await supabase
        .from('clients').select('*').eq('id', clientId).single();
      if (cErr || !data) {
        return new Response(JSON.stringify({ error: 'Client not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      client = data;

      // Rate limit: 10 enrichments / day / company
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from('client_enrichment_log')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', client.company_id)
        .gte('created_at', since);
      if ((count || 0) >= 10) {
        return new Response(JSON.stringify({ error: 'Όριο AI enrichment (10/μέρα) εξαντλήθηκε.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Draft mode requires at least a website / tax id / name to do anything useful
      if (!website && !taxId && !clientName) {
        return new Response(JSON.stringify({ error: 'website, taxId ή clientName απαιτείται' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Lightweight per-user draft rate-limit (20 / day) using same log table with a synthetic client id
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from('client_enrichment_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', since);
      if ((count || 0) >= 20) {
        return new Response(JSON.stringify({ error: 'Όριο AI enrichment (20/μέρα) εξαντλήθηκε.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let context = '';
    let logoUrl: string | undefined;
    let primarySource = '';
    let primarySourceUrl = '';
    const logoAttempts: string[] = [];

    // Helper: try a list of candidate logo URLs in order, stop at first successful upload.
    const tryLogos = async (candidates: Array<{ src: string; url: string | null | undefined }>) => {
      for (const c of candidates) {
        if (!c.url) continue;
        logoAttempts.push(`${c.src}:${c.url}`);
        const uploaded = await uploadLogo(supabase, c.url, clientId);
        if (uploaded) {
          console.log('Logo resolved via', c.src, '->', c.url);
          return uploaded;
        }
      }
      return undefined;
    };

    // 1. Firecrawl scrape if website provided
    const targetWebsite = website || client.website;
    if (targetWebsite) {
      const baseUrl = targetWebsite.startsWith('http') ? targetWebsite : `https://${targetWebsite}`;
      const fc = await firecrawlScrape(targetWebsite);
      if (fc) {
        const md = fc.markdown || fc.data?.markdown || '';
        const branding = fc.branding || fc.data?.branding;
        const rawHtml = fc.rawHtml || fc.data?.rawHtml || fc.html || fc.data?.html || '';

        const candidates: Array<{ src: string; url: string | null | undefined }> = [
          { src: 'branding.logo', url: branding?.logo },
          { src: 'branding.images.logo', url: branding?.images?.logo },
          { src: 'html-meta', url: rawHtml ? extractLogoFromHtml(rawHtml, baseUrl) : null },
          { src: 'google-favicon', url: googleFaviconUrl(targetWebsite) },
        ];
        logoUrl = await tryLogos(candidates);

        context += `=== Website (${targetWebsite}) ===\n${md.slice(0, 8000)}\n\n`;
        if (branding) context += `=== Branding ===\n${JSON.stringify(branding).slice(0, 1500)}\n\n`;
        primarySource = 'firecrawl';
        primarySourceUrl = baseUrl;
      } else {
        // Even without Firecrawl content, we can still set a default favicon
        logoUrl = await tryLogos([{ src: 'google-favicon-only', url: googleFaviconUrl(targetWebsite) }]);
      }
    }

    if (logoAttempts.length && !logoUrl) {
      console.warn('Logo lookup failed. Attempts:', JSON.stringify(logoAttempts));
    }


    // 2. Perplexity lookup αν υπάρχει ΑΦΜ ή/και αν δεν πήραμε context από website
    const targetTax = taxId || client.tax_id;
    const targetName = clientName || client.name;
    const needsPerplexityFallback = !context.trim() && !!targetName;
    // Always run Perplexity if we have a name — to enrich social accounts, tags, ΑΦΜ που λείπουν
    const wantsPerplexity = !!targetName && (targetTax || needsPerplexityFallback || !client.tax_id || !Array.isArray(client.social_accounts) || (client.social_accounts as any[]).length < 3);
    if (wantsPerplexity) {
      const socialAsk = 'ΟΛΟΥΣ τους επίσημους λογαριασμούς social media (Facebook URL, Instagram URL, LinkedIn URL, YouTube URL, TikTok URL, X/Twitter URL, Threads URL) με τα handles τους';
      const tagsAsk = 'τομέα δραστηριότητας και 3-6 σύντομα tags (industry, business model π.χ. b2b/b2c, τύπος εταιρείας π.χ. startup/agency/saas/fintech)';
      const taxAsk = client.tax_id ? '' : 'ΑΦΜ της εταιρείας από δημόσια μητρώα (ΓΕΜΗ, taxisnet, opengov) — μόνο αν είσαι σίγουρος, 9 ψηφία';
      const baseInfo = `επωνυμία, διεύθυνση, website, στοιχεία επικοινωνίας`;
      const q = targetTax
        ? `Πληροφορίες για την ελληνική εταιρεία "${targetName}" με ΑΦΜ ${targetTax}: ${baseInfo}, ${tagsAsk}, ${socialAsk}.`
        : `Πληροφορίες για την εταιρεία "${targetName}"${targetWebsite ? ` (website: ${targetWebsite})` : ''}: ${baseInfo}, ${tagsAsk}, ${socialAsk}${taxAsk ? `, ${taxAsk}` : ''}.`;
      const px = await perplexityLookup(q);
      if (px) {
        context += `=== Web Search ===\n${px.content}\n\nSources:\n${(px.citations || []).join('\n')}\n`;
        if (!primarySource) {
          primarySource = 'perplexity';
          primarySourceUrl = px.citations?.[0] || '';
        }
      }
    }

    if (!context.trim()) {
      return new Response(JSON.stringify({
        error: 'Δεν ήταν δυνατή η συλλογή πληροφοριών. Έλεγξε το website ή το ΑΦΜ.',
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. AI extraction
    const extracted = await aiExtract(context, {
      name: client.name, tax_id: client.tax_id, website: client.website,
      sector: client.sector, address: client.address,
      contact_email: client.contact_email, contact_phone: client.contact_phone,
    });

    const confidence: Record<string, string> = extracted.confidence || {};
    delete extracted.confidence;

    // Build suggestions, only for fields that differ
    const suggestions: Suggestion[] = [];
    for (const [field, value] of Object.entries(extracted)) {
      if (value === null || value === undefined || value === '') continue;
      const current = (client as any)[field];
      // Skip identical
      if (JSON.stringify(current) === JSON.stringify(value)) continue;
      suggestions.push({
        field,
        label: FIELD_LABELS[field] || field,
        value,
        currentValue: current,
        confidence: (confidence[field] as any) || 'medium',
        source: primarySource || 'ai',
        sourceUrl: primarySourceUrl || undefined,
      });
    }

    // Log enrichment
    await supabase.from('client_enrichment_log').insert({
      client_id: clientId,
      company_id: client.company_id,
      user_id: user.id,
      suggestion_count: suggestions.length,
      sources: { firecrawl: !!targetWebsite, perplexity: !!targetTax || !targetWebsite },
    });

    return new Response(JSON.stringify({ suggestions, logoUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('enrich-client error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
