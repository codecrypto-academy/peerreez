import { NextResponse } from "next/server";
import { deleteNode } from "@/lib/deleteNode";

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { networkName, nodeName } = body;

        if (!networkName || !nodeName) {
            return NextResponse.json(
                { error: "networkName and nodeName are required in request body" },
                { status: 400 }
            );
        }

        const result = await deleteNode(networkName, nodeName);
        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        console.error("❌ Error deleting node:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
