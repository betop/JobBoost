import { NextRequest, NextResponse } from "next/server";

const XANO_BASE_URL = "https://x8ki-letl-twmt.n7.xano.io/api:eqIK8vAt:v1";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const extensionName = searchParams.get("extension_name");

    let url = `${XANO_BASE_URL}/extensions/versions`;
    if (extensionName) {
      url += `?extension_name=${encodeURIComponent(extensionName)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Xano API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Missing token" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${XANO_BASE_URL}/extensions/versions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Xano API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating version:", error);
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    );
  }
}
