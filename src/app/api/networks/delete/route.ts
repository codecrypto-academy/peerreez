// src/app/api/networks/delete/route.ts
import { NextResponse } from "next/server";
import { deleteNetwork } from "@/lib/deleteNetwork";

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { networkName } = body;

        if (!networkName) {
            return NextResponse.json(
                { error: "networkName is required in request body" },
                { status: 400 }
            );
        }

        const result = await deleteNetwork(networkName);
        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        console.error("❌ Error deleting network:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
