import db from "@/app/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();

    // STEP 1: Create new application
    const [appResult] = await db.execute(
      "INSERT INTO applications (user_id, status) VALUES (?, ?)",
      [1, "draft"]
    );

    const application_id = appResult.insertId;

    // STEP 2: Insert general info
    const query = `
      INSERT INTO beneficiary_general
      (application_id, first_name, middle_name, last_name, dob_bs, gender, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      application_id,
      body.first_name,
      body.middle_name,
      body.last_name,
      body.dob_bs,
      body.gender,
      body.phone,
    ];

    await db.execute(query, values);

    return Response.json({
      success: true,
      application_id: application_id,
    });

  } catch (error) {
    console.error("Save general error:", error);

    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}