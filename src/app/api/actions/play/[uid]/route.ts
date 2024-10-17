import { NextRequest, NextResponse } from "next/server";
import {
	ActionError,
	ActionGetResponse,
	ActionPostRequest,
	ActionPostResponse,
	createPostResponse,
} from "@solana/actions";
import {
	Connection,
	LAMPORTS_PER_SOL,
	PublicKey,
	SystemProgram,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";

import {
	CLUSTER_URL,
	HEADERS,
	PROCESSING_FEE,
	URL_PATH,
	fetchGameData,
	shuffle,
} from "@/helpers";

const TO_PUBKEY = new PublicKey(process.env.PROGRAM_ACCOUNT!);

export async function GET(
	req: NextRequest,
	context: { params: { uid: string } }
) {
	const uid = context.params.uid;
	const { username, truth1, truth2, lie } = await fetchGameData(uid);
	const [optionA, optionB, optionC] = shuffle([truth1, truth2, lie]);

	const payload: ActionGetResponse = {
		title: "Two Truths and One Lie",
		icon: `${new URL(req.url).origin}/twotruthonelie.jpg`,
		description: `How well do you know ${username}?\nSpot the lie from these three statements.\n\nA. ${optionA}\nB. ${optionB}\nC. ${optionC}`,
		label: "Choose The Lie",
		links: {
			actions: [
				{
					type: "transaction",
					href: `${URL_PATH}/play/${uid}?choice=${optionA}`,
					label: `A is the lie`,
				},
				{
					type: "transaction",
					href: `${URL_PATH}/play/${uid}?choice=${optionB}`,
					label: `B is the lie`,
				},
				{
					type: "transaction",
					href: `${URL_PATH}/play/${uid}?choice=${optionC}`,
					label: `C is the lie`,
				},
			],
		},
	};

	return NextResponse.json(payload, { status: 200, headers: HEADERS });
}

export async function POST(
	req: NextRequest,
	context: { params: { uid: string } }
) {
	try {
		const body: ActionPostRequest = await req.json();
		if (!body.account?.trim()) {
			throw new Error("`account` field is required");
		}

		let payer: PublicKey;
		try {
			payer = new PublicKey(body.account);
		} catch (err: any) {
			throw new Error("Invalid account provided: not a valid public key");
		}

		const connection = new Connection(CLUSTER_URL);
		const { blockhash } = await connection.getLatestBlockhash();

		const processAnswer = SystemProgram.transfer({
			fromPubkey: payer,
			toPubkey: TO_PUBKEY,
			lamports: PROCESSING_FEE * LAMPORTS_PER_SOL,
		});

		const message = new TransactionMessage({
			payerKey: payer,
			recentBlockhash: blockhash,
			instructions: [processAnswer],
		}).compileToV0Message();

		const tx = new VersionedTransaction(message);

		const url = new URL(req.url);
		const uid = context.params.uid;
		const choice = url.searchParams.get("choice");

		const payload: ActionPostResponse = await createPostResponse({
			fields: {
				type: "transaction",
				transaction: tx,
				links: {
					next: {
						type: "post",
						href: `${URL_PATH}/play/${uid}/confirm?choice=${choice}`,
					},
				},
			},
		});

		return NextResponse.json(payload, { status: 200, headers: HEADERS });
	} catch (err: any) {
		return NextResponse.json({ message: err.message } as ActionError, {
			status: 400,
			headers: HEADERS,
		});
	}
}

export const OPTIONS = GET;
