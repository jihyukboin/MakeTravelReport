export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "요청 형식을 확인해 주세요." }, { status: 400 });
  }
  try {
    const base = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002";
    const response = await fetch(`${base.replace(/\/$/, "")}/api/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return Response.json({ message: data?.message || (response.status === 404
        ? "추천 API가 아직 실행되지 않았어요. 백엔드를 재시작한 후 다시 시도해 주세요."
        : "여행지를 조회하지 못했어요. 잠시 후 다시 시도해 주세요.") }, { status: response.status });
    }
    return Response.json(data);
  } catch {
    return Response.json({ message: "추천 서버에 연결하지 못했어요. 백엔드와 DB 실행 상태를 확인해 주세요." }, { status: 503 });
  }
}
