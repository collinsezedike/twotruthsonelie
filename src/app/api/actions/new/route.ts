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

import { CLUSTER_URL, HEADERS, MINT_FEE, URL_PATH } from "@/helpers";

const TO_PUBKEY = new PublicKey(process.env.PROGRAM_ACCOUNT!);

export async function GET(req: NextRequest) {
	const payload: ActionGetResponse = {
		title: "Two Truths and One Lie",
		icon: `${new URL(req.url).origin}/twotruthonelie.jpg`,
		description: `Find out how well your friends know you. Enter two truths and one lie about yourself and see if they can spot the lie.`,
		label: "Create",
		links: {
			actions: [
				{
					type: "transaction",
					href: `${URL_PATH}/new?username={username}&truth1={truth1}&truth2={truth2}&lie={lie}`,
					label: "Create",
					parameters: [
						{
							name: "username",
							label: "Enter your name or what your friends know you as",
							required: true,
						},
						{
							name: "truth1",
							label: "Enter the first truth about yourself. An usual character, maybe, to deceive them",
							required: true,
						},
						{
							name: "truth2",
							label: "Enter another truth about yourself. Try to trick them with this one",
							required: true,
						},
						{
							name: "lie",
							label: "Now, drop this lie. Make it as convincing as possible",
							required: true,
						},
					],
				},
			],
		},
	};

	return NextResponse.json(payload, { status: 200, headers: HEADERS });
}

export async function POST(req: NextRequest) {
	try {
		const username = new URL(req.url).searchParams.get("username");
		const truth1 = new URL(req.url).searchParams.get("truth1");
		const truth2 = new URL(req.url).searchParams.get("truth2");
		const lie = new URL(req.url).searchParams.get("lie");
		if (
			!username?.trim() ||
			!truth1?.trim() ||
			!truth2?.trim() ||
			!lie?.trim()
		) {
			throw new Error("Required fields are missing");
		}

		const body: ActionPostRequest = await req.json();
		if (!body.account?.trim())
			throw new Error("`account` field is required");

		let payer: PublicKey;
		try {
			payer = new PublicKey(body.account);
		} catch (err: any) {
			throw new Error("Invalid account provided: not a valid public key");
		}

		const connection = new Connection(CLUSTER_URL);
		const { blockhash } = await connection.getLatestBlockhash();

		const initializeMint = SystemProgram.transfer({
			fromPubkey: payer,
			toPubkey: TO_PUBKEY,
			lamports: MINT_FEE * LAMPORTS_PER_SOL,
		});

		const message = new TransactionMessage({
			payerKey: payer,
			recentBlockhash: blockhash,
			instructions: [initializeMint],
		}).compileToV0Message();

		const tx = new VersionedTransaction(message);

		const payload: ActionPostResponse = await createPostResponse({
			fields: {
				type: "transaction",
				transaction: tx,
				links: {
					next: {
						type: "post",
						href: `${URL_PATH}/new/confirm?username=${username}&truth1=${truth1}&truth2=${truth2}&lie=${lie}`,
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
