import db from "@/app/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();

    await db.execute(
      `INSERT INTO agreements (application_id, agreed, agreed_at)
       VALUES (?, ?, NOW())`,
      [body.application_id, true]
    );

    return Response.json({
      success: true
    });

  } catch (error) {
    console.error("Save agreement error:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}