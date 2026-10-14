// Fonction serverless Vercel : GET /api/football?competition=FL1[&season=2025]
import { proxyFootballData } from '../server/footballData';

export async function GET(request: Request): Promise<Response> {
  const result = await proxyFootballData(new URL(request.url), process.env.FOOTBALL_DATA_API_KEY);
  return new Response(result.body, { status: result.status, headers: result.headers });
}
