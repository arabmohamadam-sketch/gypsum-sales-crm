import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/src/lib/supabase";

export async function GET() {
  try {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .limit(1);

    if (error) {
      console.error("❌ Supabase query error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Supabase connection failed",
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
      customersTableAccessible: true,
      sample: data,
    });
  } catch (error) {
    console.error("❌ Supabase connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unexpected error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}