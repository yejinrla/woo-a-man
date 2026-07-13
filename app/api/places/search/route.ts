import { NextRequest, NextResponse } from "next/server";

interface KakaoPlaceDocument {
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_name: string;
  x: string;
  y: string;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ places: [] });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "카카오 API 키가 설정되지 않았어요" }, { status: 500 });
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "10");

  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` }
  });

  if (!response.ok) {
    return NextResponse.json({ error: "장소 검색에 실패했어요" }, { status: response.status });
  }

  const data = (await response.json()) as { documents: KakaoPlaceDocument[] };

  const places = data.documents.map((doc) => ({
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name,
    category: doc.category_name,
    x: doc.x,
    y: doc.y
  }));

  return NextResponse.json({ places });
}
