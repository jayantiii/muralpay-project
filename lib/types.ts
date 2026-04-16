export type Urgency = "fast" | "normal";
export type Rail = "bank" | "stablecoin";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";

export interface CreatePayoutInput {
  recipient_name: string;
  recipient_email?: string;
  recipient_address_line1?: string;
  recipient_city?: string;
  recipient_state?: string;
  recipient_postal_code?: string;
  bank_beneficiary_name?: string;
  bank_beneficiary_address?: string;
  bank_routing_number?: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_address?: string;
  bank_account_type?: "CHECKING" | "SAVINGS";
  country: string;
  amount: number;
  currency: string;
  purpose?: string;
  urgency: Urgency;
  wallet_address?: string;
  wallet_network?: string;
}

export interface RoutingDecision {
  selected_rail: Rail;
  reason: string;
}

export interface PayoutRecord {
  id: string;
  recipient_name: string;
  country: string;
  amount: number;
  currency: string;
  rail: Rail;
  status: PayoutStatus;
  purpose: string | null;
  urgency: Urgency;
  mural_transaction_id: string | null;
  mural_response: string | null;
  created_at: string;
}

export interface RoutingLogRecord {
  id: string;
  payout_id: string;
  input_data: string;
  decision: Rail;
  reason: string;
  created_at: string;
}
