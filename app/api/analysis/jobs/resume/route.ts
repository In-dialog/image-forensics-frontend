import { forwardJson } from '@/server/analysis/client';

export const runtime = 'nodejs';
export function POST(request: Request) { return forwardJson(request, '/jobs/resume'); }
