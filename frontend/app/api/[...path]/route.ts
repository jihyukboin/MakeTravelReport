async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!/^chats(?:\/[0-9a-f-]{36})?$/.test(path)) {
    return Response.json({ message: "페이지를 찾을 수 없어요." }, { status: 404 });
  }
  try {
    const base = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002";
    const upstream = await fetch(`${base.replace(/\/$/, "")}/api/${path}`, {
      method: request.method,
      headers: { "Content-Type": "application/json", Cookie: request.headers.get("cookie") || "" },
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
    for (const cookie of upstream.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
    return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers });
  } catch {
    return Response.json({ message: "서버에 연결하지 못했어요. 백엔드 실행 상태를 확인해 주세요." }, { status: 503 });
  }
}

export const GET = proxy;
export const PUT = proxy;
