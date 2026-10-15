import { renderToBuffer } from "@react-pdf/renderer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getTripReport } from "../../../../../lib/trip-report";
import { TripPdf } from "../../../../../components/trip-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const report = await getTripReport(chatId);
  const [vehicle, destination] = await Promise.all([
    readFile(path.join(process.cwd(), "public", report.vehicleImage)).then((buffer) => sharp(buffer).jpeg({ quality: 88 }).toBuffer()),
    report.destinationImage ? fetch(report.destinationImage, { signal: AbortSignal.timeout(15000) })
      .then(async (response) => {
        if (!response.ok) throw new Error("여행지 이미지를 불러오지 못했습니다.");
        return sharp(Buffer.from(await response.arrayBuffer())).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
      }).catch(() => null) : Promise.resolve(null),
  ]);
  const buffer = await renderToBuffer(TripPdf({ report, images: { vehicle, destination } }));
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="travel-plan-${chatId}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
