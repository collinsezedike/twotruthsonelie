import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import {
	ActionError,
	CompletedAction,
	NextActionPostRequest,
} from "@solana/actions";

import { CLUSTER_URL, HEADERS, saveNewGameData } from "@/helpers";

export const GET = async (req: NextRequest) => {
	return NextResponse.json(
		{ message: "Method not supported" } as ActionError,
		{ status: 403, headers: HEADERS }
	);
};

export const OPTIONS = async () => {
	return NextResponse.json(null, { status: 200, headers: HEADERS });
};

export const POST = async (
	req: NextRequest,
	context: { params: { username: string } }
) => {
	try {
		const body: NextActionPostRequest = await req.json();

		const signature = body.signature as string;
		if (!signature.trim()) throw new Error("Invalid signature provided");

		const connection = new Connection(CLUSTER_URL);

		try {
			let status = await connection.getSignatureStatus(signature);
			if (!status) throw new Error("Unknown signature status");
			if (status.value?.confirmationStatus) {
				if (
					status.value.confirmationStatus != "confirmed" &&
					status.value.confirmationStatus != "finalized"
				) {
					throw new Error("Unable to confirm the transaction");
				}
			}
		} catch (err) {
			throw err;
		}

		const url = new URL(req.url);
		const username = url.searchParams.get("username");
		const truth1 = url.searchParams.get("truth1");
		const truth2 = url.searchParams.get("truth2");
		const lie = url.searchParams.get("lie");
		if (
			!username?.trim() ||
			!truth1?.trim() ||
			!truth2?.trim() ||
			!lie?.trim()
		) {
			throw new Error("Required fields are missing");
		}

		const uid = await saveNewGameData(username, truth1, truth2, lie);

		const payload: CompletedAction = {
			type: "completed",
			title: "New game created successfully!",
			icon: `${url.origin}/twotruthonelie.jpg`,
			label: "Created!",
			description: `Here is your game url:\n${url.origin}/play/${uid}\n\nShare and find out how much your friends know you.`,
		};

		return NextResponse.json(payload, { status: 201, headers: HEADERS });
	} catch (err: any) {
		console.log({ err });
		return NextResponse.json({ message: err.message } as ActionError, {
			status: 400,
			headers: HEADERS,
		});
	}
};
