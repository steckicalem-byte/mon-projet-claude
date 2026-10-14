// Fonction serverless Vercel : GET /api/analyse?competition=CL&match=123456
import { analyseMatch } from '../server/analysis.js';

export async function GET(request: Request): Promise<Response> {
  const result = await analyseMatch(new URL(request.url), process.env.FOOTBALL_DATA_API_KEY, process.env.ANTHROPIC_API_KEY);
  return new Response(result.body, { status: result.status, headers: result.headers });
}
