import { forwardJson, proxyAnalysis } from '@/server/analysis/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() { return proxyAnalysis('/jobs'); }
export function POST(request: Request) { return forwardJson(request, '/jobs'); }
