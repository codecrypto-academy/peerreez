import { NextResponse } from "next/server";
import { createNode } from "@/lib/createNode";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { nodeName, nodeType, networkName } = body;

        if (!nodeName || !nodeType || !networkName) {
            return NextResponse.json(
                { error: "Missing required parameters: nodeName, nodeType, networkName" },
                { status: 400 }
            );
        }

        // Validar tipo de nodo
        if (!["rpc", "validator", "signer"].includes(nodeType)) {
            return NextResponse.json(
                { error: "Invalid nodeType. Must be one of: rpc, validator, signer" },
                { status: 400 }
            );
        }

        // Ejecutar creación del nodo
        await createNode({
            nodeName,
            nodeType,
            networkName,
        });

        return NextResponse.json(
            { success: true, message: `Node ${nodeName} (${nodeType}) created in network ${networkName}` },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("❌ Error creating node:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
