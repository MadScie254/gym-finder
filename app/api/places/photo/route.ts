import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Photos come from OpenStreetMap tags, not a paid photo API." }, { status: 404 });
}
