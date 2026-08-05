import { Horizon, Keypair, NetworkError, Networks, StrKey } from "@stellar/stellar-sdk";
import { NotFoundError, ValidationError } from "../utils/errors";

const HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = process.env.NETWORK === "mainnet"
  ? Networks.PUBLIC
  : Networks.TESTNET;
const IS_MAINNET = process.env.NETWORK === "mainnet";

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

export function assertValidPublicKey(publicKey: string): void {
  if (!StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new ValidationError(`Invalid Stellar public key: ${publicKey}`);
  }
}

export function assertValidSecretKey(secretKey: string): void {
  if (!StrKey.isValidEd25519SecretSeed(secretKey)) {
    throw new ValidationError("Invalid Stellar secret key");
  }
}

/** Fund a testnet account via Friendbot */
export async function fundWallet(publicKey: string): Promise<void> {
  assertValidPublicKey(publicKey);
  if (IS_MAINNET) {
    throw new ValidationError("Friendbot funding is only available on testnet");
  }
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
  assertValidPublicKey(publicKey);
  let account;
  try {
    account = await server.loadAccount(publicKey);
  } catch (err) {
    if (err instanceof NetworkError && err.response?.status === 404) {
      throw new NotFoundError(`Account not found: ${publicKey}`);
    }
    throw err;
  }
  const native = account.balances.find((b: any) => b.asset_type === "native");
  return native ? (native as any).balance : "0";
}
