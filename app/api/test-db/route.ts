import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export async function GET() {
  try {
    await db.query("SELECT 1");
    return NextResponse.json({ message: "Database Connected Successfully!" });
  } catch (error) {
    return NextResponse.json({ error: "Database connection failed" });
  }
}