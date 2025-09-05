import { NextResponse } from "next/server";
import { createNetwork } from "@/lib/createNetwork";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { nameNetwork, chainId, subnet, founderAccounts, rpcPort } = body;

        if (!nameNetwork || !chainId || !subnet || !founderAccounts) {
            return NextResponse.json(
                { error: "Missing required parameters: nameNetwork, chainId, subnet, founderAccounts" },
                { status: 400 }
            );
        }

        // founderAccounts debe ser un array
        if (!Array.isArray(founderAccounts)) {
            return NextResponse.json(
                { error: "founderAccounts must be an array of addresses" },
                { status: 400 }
            );
        }

        // Ejecutar la creación de la red
        await createNetwork({
            nameNetwork,
            chainId: Number(chainId),
            subnet,
            founderAccounts,
            rpcPort: rpcPort ? Number(rpcPort) : undefined,
        });

        return NextResponse.json(
            { success: true, message: `Network ${nameNetwork} created successfully.` },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("❌ Error creating network:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
