import { Horizon, Keypair, Networks } from "@stellar/stellar-sdk";
import fetch from "node-fetch";

const HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = process.env.NETWORK === "mainnet"
  ? Networks.PUBLIC
  : Networks.TESTNET;

export const server = new Horizon.Server(HORIZON_URL);

export interface WalletInfo {
  publicKey: string;
  secretKey: string;
}

/** Generate a new Stellar keypair */
export function createWallet(): WalletInfo {
  const keypair = Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

/** Fund a testnet account via Friendbot */
export async function fundWallet(publicKey: string): Promise<void> {
  const res = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Friendbot failed: ${body}`);
  }
}

/** Get XLM balance for an account */
export async function getBalance(publicKey: string): Promise<string> {
  const account = await server.loadAccount(publicKey);
  const native = account.balances.find((b: any) => b.asset_type === "native");
  return native ? (native as any).balance : "0";
}
