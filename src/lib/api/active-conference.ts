import "server-only";

import * as mockImpl from "@/lib/api/mock/conference.mock";
import * as realImpl from "@/lib/api/conference";

const USE_MOCK = process.env["USE_MOCK"] === "true";

export const activeConference: typeof mockImpl = USE_MOCK ? mockImpl : realImpl;
