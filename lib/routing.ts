import type { CreatePayoutInput, RoutingDecision } from "@/lib/types";

const LATAM_COUNTRIES = new Set([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "CR",
  "DO",
  "EC",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PY",
  "SV",
  "UY",
]);

const BANK_DEFAULT_COUNTRIES = new Set(["US", "CA", "GB", "DE", "FR", "ES", "IT", "NL", "IE", "PT"]);

export function decideRail(input: CreatePayoutInput): RoutingDecision {
  if (input.preferred_rail) {
    return {
      selected_rail: input.preferred_rail,
      reason: `User-selected rail override: ${input.preferred_rail}.`,
    };
  }

  const country = input.country.trim().toUpperCase();

  if (input.amount > 1000) {
    return {
      selected_rail: "bank",
      reason: "High-value payout (>1000) prefers bank transfer for operational stability.",
    };
  }

  if (LATAM_COUNTRIES.has(country) || input.urgency === "fast") {
    return {
      selected_rail: "stablecoin",
      reason: "LATAM corridor or fast urgency prefers stablecoin for quicker settlement.",
    };
  }

  if (BANK_DEFAULT_COUNTRIES.has(country)) {
    return {
      selected_rail: "bank",
      reason: "US/EU corridor defaults to bank transfer.",
    };
  }

  return {
    selected_rail: "stablecoin",
    reason: "Defaulting to stablecoin for cross-border flexibility.",
  };
}
