import { forwardJson, proxyAnalysis } from '@/server/analysis/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() { return proxyAnalysis('/config'); }
export function PUT(request: Request) { return forwardJson(request, '/config'); }
