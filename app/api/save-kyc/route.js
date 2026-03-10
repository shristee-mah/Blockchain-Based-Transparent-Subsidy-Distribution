import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export async function POST(req) {

  const data = await req.json();

  try {
    const query = `
      INSERT INTO beneficiary_kyc
      (application_id, citizenship_no, issued_date, marital_status, province, district, municipality, tole, ward_no, father_name, mother_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.application_id,
      data.citizenship_no,
      data.issued_date,
      data.marital_status,
      data.province,
      data.district,
      data.municipality,
      data.tole,
      data.ward_no,
      data.father_name,
      data.mother_name
    ];

    await db.execute(query, values);

    return NextResponse.json({ message: "KYC Saved Successfully" });

  } catch (error) {
    console.error("Save KYC error:", error);
    return NextResponse.json({ error: "Database Error" }, { status: 500 });
  }
}