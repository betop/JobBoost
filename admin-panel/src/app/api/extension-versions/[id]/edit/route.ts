import { NextRequest, NextResponse } from "next/server";

const XANO_BASE_URL = "https://api.shsws-solutions.com/api:aN9XfAKd";

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
    const body = await request.json();

    const response = await fetch(
      `${XANO_BASE_URL}/extensions/versions/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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
    console.error("Error editing version:", error);
    return NextResponse.json(
      { error: "Failed to edit version" },
      { status: 500 }
    );
  }
}
