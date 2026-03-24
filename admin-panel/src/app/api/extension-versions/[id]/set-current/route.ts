import { NextRequest, NextResponse } from "next/server";

const XANO_BASE_URL = "https://x8ki-letl-twmt.n7.xano.io/api:eqIK8vAt:v1";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Missing token" },
        { status: 401 }
      );
    }

    const id = params.id;

    const response = await fetch(
      `${XANO_BASE_URL}/extensions/versions/${id}/set-current`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
    console.error("Error setting current version:", error);
    return NextResponse.json(
      { error: "Failed to set current version" },
      { status: 500 }
    );
  }
}
