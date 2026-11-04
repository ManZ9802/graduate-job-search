import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4177);
const publicDir = join(process.cwd(), "public");
const freehireUrl = "https://freehire.me/api/v1/jobs/search";

const tracks = {
  all: { label: "All graduate roles", query: "graduate" },
  software: { label: "Software engineering", query: "graduate software engineer", category: "software_engineering" },
  ai: { label: "AI and data", query: "graduate AI data engineer" },
  quant: { label: "Quant and finance", query: "graduate analyst quantitative finance", category: "finance" },
  product: { label: "Product and operations", query: "graduate product operations", category: "product" },
};

const cache = new Map();
const cacheMs = 5 * 60 * 1000;

function sendJson(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

function sanitiseText(value, max = 80) {
  return String(value || "").replace(/[^a-zA-Z0-9 +,#.&/-]/g, "").trim().slice(0, max);
}

function mapJob(job) {
  return {
    id: job.public_slug,
    title: job.title,
    company: job.company,
    location: job.location,
    url: job.url,
    postedAt: job.posted_at,
    source: job.source,
    category: job.enrichment?.category || null,
    seniority: job.enrichment?.seniority || null,
    skills: (job.skills || []).slice(0, 7),
    reality: job.reality?.class || null,
    workMode: job.work_mode || null,
  };
}

async function handleJobs(reqUrl, res) {
  const trackKey = sanitiseText(reqUrl.searchParams.get("track") || "all", 20).toLowerCase();
  const config = tracks[trackKey] || tracks.all;
  const suppliedQuery = sanitiseText(reqUrl.searchParams.get("q"), 80);
  const query = suppliedQuery || config.query;
  const cacheKey = `${trackKey}:${query}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < cacheMs) return sendJson(res, 200, { ...hit.value, cached: true });

  const upstream = new URL(freehireUrl);
  upstream.searchParams.set("q", query);
  upstream.searchParams.set("countries", "SG");
  upstream.searchParams.set("seniority", "junior");
  upstream.searchParams.set("limit", "30");
  upstream.searchParams.set("sort", "posted_at");
  upstream.searchParams.set("order", "desc");
  if (config.category) upstream.searchParams.set("category", config.category);

  try {
    const response = await fetch(upstream, { headers: { accept: "application/json", "user-agent": "GraduateJobSearch/0.1" } });
    if (!response.ok) throw new Error(`FreeHire returned ${response.status}`);
    const payload = await response.json();
    const value = {
      provider: "FreeHire",
      track: trackKey,
      query,
      total: payload.meta?.total ?? 0,
      jobs: (payload.data || []).map(mapJob),
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
    cache.set(cacheKey, { at: Date.now(), value });
    sendJson(res, 200, value);
  } catch (error) {
    sendJson(res, 502, { error: "Live job data is temporarily unavailable.", detail: error.message });
  }
}

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  if (requestUrl.pathname === "/api/jobs") return handleJobs(requestUrl, res);
  if (requestUrl.pathname === "/api/health") return sendJson(res, 200, { ok: true });

  const requested = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filename = normalize(join(publicDir, requested));
  if (!filename.startsWith(publicDir)) return sendJson(res, 403, { error: "Forbidden" });
  try {
    const body = await readFile(filename);
    res.writeHead(200, { "content-type": types[extname(filename)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Graduate Job Search running at http://127.0.0.1:${port}`);
});
