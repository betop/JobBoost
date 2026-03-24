import { NextRequest, NextResponse } from "next/server";

const XANO_BASE_URL = "https://x8ki-letl-twmt.n7.xano.io/api:eqIK8vAt:v1";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const extensionName = searchParams.get("extension_name");

    if (!extensionName) {
      return NextResponse.json(
        { error: "Missing required query parameter: extension_name" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${XANO_BASE_URL}/extensions/versions/current?extension_name=${encodeURIComponent(extensionName)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Xano API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching current version:", error);
    return NextResponse.json(
      { error: "Failed to fetch current version" },
      { status: 500 }
    );
  }
}
