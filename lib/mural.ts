import type { CreatePayoutInput, Rail } from "@/lib/types";

interface MuralExecutionResult {
  transactionId: string;
  status: "completed" | "failed";
  raw: unknown;
}

interface MuralConfig {
  baseUrl: string;
  apiKey?: string;
  sourceAccountId?: string;
  organizationId?: string;
  transferApiKey?: string;
}

interface MuralCreatePayoutRequestResponse {
  id?: string;
  status?: string;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getMuralConfig() {
  return {
    baseUrl: process.env.MURAL_BASE_URL ?? "https://api-staging.muralpay.com",
    apiKey: process.env.MURAL_API_KEY,
    sourceAccountId: process.env.MURAL_SOURCE_ACCOUNT_ID,
    organizationId: process.env.MURAL_ORG_ID,
    transferApiKey: process.env.MURAL_TRANSFER_API_KEY,
  } satisfies MuralConfig;
}

function buildPayoutPayload(input: CreatePayoutInput, rail: Rail, sourceAccountId: string) {
  const tokenSymbol = "USDC";
  const tokenAmount = input.amount;

  if (rail === "bank") {
    if (!input.bank_beneficiary_name || !input.bank_routing_number || !input.bank_account_number) {
      throw new Error("For bank rail, provide bank beneficiary name, routing number, and account number.");
    }

    const ownerName = (input.bank_beneficiary_name ?? input.recipient_name).trim();
    const nameParts = ownerName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? "Recipient";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

    const payout = {
      amount: {
        tokenSymbol,
        tokenAmount,
      },
      recipientInfo: {
        type: "business",
        name: input.recipient_name,
        email: input.recipient_email,
        physicalAddress: {
          address1: input.recipient_address_line1,
          city: input.recipient_city,
          state: input.recipient_state,
          zip: input.recipient_postal_code,
          country: input.country.toUpperCase(),
        },
        details: {
          type: "fiat",
        },
      },
      payoutDetails: {
        type: "fiat",
        fiatAndRailDetails: {
          type: input.currency.toLowerCase(),
          symbol: input.currency.toUpperCase(),
          accountType: input.bank_account_type ?? "CHECKING",
          bankAccountNumber: input.bank_account_number,
          bankRoutingNumber: input.bank_routing_number,
        },
        bankName: input.bank_name ?? "Lead Bank",
        bankAddress: input.bank_address ?? "1801 Main St, Kansas City, MO 64108",
        bankAccountOwner: {
          firstName,
          lastName,
        },
        bankAccountOwnerAddress: input.bank_beneficiary_address ?? input.recipient_address_line1,
      },
    };

    return {
      sourceAccountId,
      memo: input.purpose ?? `Payout for ${input.recipient_name} (${rail})`,
      payouts: [payout],
    };
  }

  if (!input.wallet_address) {
    throw new Error("For stablecoin rail, provide wallet address.");
  }

  const payout = {
    amount: {
      tokenSymbol,
      tokenAmount,
    },
    recipientInfo: {
      type: "business",
      name: input.recipient_name,
      email: input.recipient_email,
      physicalAddress: {
        address1: input.recipient_address_line1,
        city: input.recipient_city,
        state: input.recipient_state,
        zip: input.recipient_postal_code,
        country: input.country.toUpperCase(),
      },
      details: {
        type: "blockchain",
      },
    },
    payoutDetails: {
      type: "blockchain",
      walletDetails: {
        walletAddress: input.wallet_address,
        blockchain: (input.wallet_network ?? "POLYGON").toUpperCase(),
      },
    },
  };

  return {
    sourceAccountId,
    memo: input.purpose ?? `Payout for ${input.recipient_name} (${rail})`,
    payouts: [payout],
  };
}

export async function executeMuralPayout(input: CreatePayoutInput, rail: Rail): Promise<MuralExecutionResult> {
  const { baseUrl, apiKey, sourceAccountId, organizationId, transferApiKey } = getMuralConfig();

  if (!apiKey) {
    return {
      transactionId: `demo_${crypto.randomUUID()}`,
      status: "completed",
      raw: {
        simulated: true,
        message: "MURAL_API_KEY not set, returning simulated sandbox response.",
        input,
        rail,
      },
    };
  }

  if (!sourceAccountId || !isUuid(sourceAccountId)) {
    return {
      transactionId: `failed_${crypto.randomUUID()}`,
      status: "failed",
      raw: {
        error: "MURAL_SOURCE_ACCOUNT_ID must be set to a valid UUID for live sandbox execution.",
      },
    };
  }

  if (!organizationId || !isUuid(organizationId)) {
    return {
      transactionId: `failed_${crypto.randomUUID()}`,
      status: "failed",
      raw: {
        error: "MURAL_ORG_ID must be set to a valid UUID for live sandbox execution.",
      },
    };
  }

  try {
    const payload = buildPayoutPayload(input, rail, sourceAccountId);
    const baseHeaders: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "on-behalf-of": organizationId,
    };
    const createResponse = await fetch(`${baseUrl}/api/payouts/payout`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(payload),
    });

    const createRaw: MuralCreatePayoutRequestResponse & { [key: string]: unknown } = await createResponse
      .json()
      .catch(() => ({ message: "No JSON payload returned on create payout request." }));
    if (!createResponse.ok || typeof createRaw.id !== "string") {
      return {
        transactionId: `failed_${crypto.randomUUID()}`,
        status: "failed",
        raw: {
          stage: "create_payout_request",
          response: createRaw,
        },
      };
    }

    const executeHeaders: Record<string, string> = { ...baseHeaders };
    if (transferApiKey) {
      executeHeaders["transfer-api-key"] = transferApiKey;
    }
    const executeResponse = await fetch(`${baseUrl}/api/payouts/payout/${createRaw.id}/execute`, {
      method: "POST",
      headers: executeHeaders,
      body: JSON.stringify({}),
    });
    const executeRaw = await executeResponse.json().catch(() => ({ message: "No JSON payload returned on execute payout request." }));
    if (!executeResponse.ok) {
      return {
        transactionId: `failed_${crypto.randomUUID()}`,
        status: "failed",
        raw: {
          stage: "execute_payout_request",
          payoutRequestId: createRaw.id,
          response: executeRaw,
        },
      };
    }

    const transactionId = typeof executeRaw?.id === "string" ? executeRaw.id : createRaw.id;
    return {
      transactionId,
      status: "completed",
      raw: {
        create: createRaw,
        execute: executeRaw,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error executing mural payout.";
    return {
      transactionId: `failed_${crypto.randomUUID()}`,
      status: "failed",
      raw: { error: message },
    };
  }

}
