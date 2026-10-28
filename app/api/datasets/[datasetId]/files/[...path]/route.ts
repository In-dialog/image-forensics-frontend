import { readDatasetFile } from "@/features/results/server/dataset-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ datasetId: string; path: string[] }> };

export async function GET(_request: Request, { params }: Context) {
  const { datasetId, path } = await params;
  try {
    const file = await readDatasetFile(datasetId, path);
    if (!file) return new Response("File not found", { status: 404 });
    return new Response(new Uint8Array(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Could not read result file", { status: 500 });
  }
}
