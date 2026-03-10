import db from "@/app/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();

    const query = `
      INSERT INTO subsidy_scheme
      (application_id, scheme_name, previous_subsidy, declaration)
      VALUES (?, ?, ?, ?)
    `;

    const values = [
      body.application_id,
      Array.isArray(body.scheme_name) ? body.scheme_name.join(", ") : body.scheme_name,
      body.previous_subsidy,
      body.declaration
    ];

    await db.execute(query, values);

    return Response.json({ success: true });

  } catch (error) {
    console.error("Save scheme error:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}