import "server-only";

import * as mockImpl from "@/lib/api/mock/iam.mock";
import * as realImpl from "@/lib/api/iam";

const USE_MOCK = process.env["USE_MOCK"] === "true";

export const activeIam: typeof mockImpl = USE_MOCK ? mockImpl : realImpl;
