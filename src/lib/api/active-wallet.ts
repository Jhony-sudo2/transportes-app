import "server-only";

import * as mockImpl from "@/lib/api/mock/wallet.mock";
import * as realImpl from "@/lib/api/wallet";

const USE_MOCK = process.env["USE_MOCK"] === "true";

export const activeWallet: typeof mockImpl = USE_MOCK ? mockImpl : realImpl;
