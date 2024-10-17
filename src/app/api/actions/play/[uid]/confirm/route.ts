import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import {
	ActionError,
	CompletedAction,
	NextActionPostRequest,
} from "@solana/actions";

import { CLUSTER_URL, fetchGameData, HEADERS, verifyAnswer } from "@/helpers";

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
	context: { params: { uid: string } }
) => {
	try {
		const body: NextActionPostRequest = await req.json();

		const signature = body.signature as string;
		if (!signature.trim()) throw new Error("invalid signature provided");

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
		const uid = context.params.uid;
		const choice = url.searchParams.get("choice") as string;
		const isCorrect = await verifyAnswer(uid, choice);
		const { username } = await fetchGameData(uid);

		let payload: CompletedAction;

		if (isCorrect) {
			payload = {
				type: "completed",
				title: "Correct!",
				icon: `${new URL(req.url).origin}/twotruthonelie.jpg`,
				label: "Correct!",
				description: `You got the lie correctly.\n\nScreenshot and send to ${username} to prove yourself.`,
			};
		} else {
			payload = {
				type: "completed",
				title: "Wrong!",
				icon: `${new URL(req.url).origin}/twotruthonelie.jpg`,
				label: "Failed!",
				description: `Doesn't seem like you know ${username} so well.`,
			};
		}

		return NextResponse.json(payload, { status: 201, headers: HEADERS });
	} catch (err: any) {
		return NextResponse.json({ message: err.message } as ActionError, {
			status: 400,
			headers: HEADERS,
		});
	}
};
