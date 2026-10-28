import { NextResponse } from "next/server";
import { listDatasets } from "@/features/results/server/dataset-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ datasets: await listDatasets() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ datasets: [], error: "Could not read the results folder." }, { status: 500 });
  }
}
