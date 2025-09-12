import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface ClientLogin {
  id: string;
  name: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export interface MessagesTaken {
  id: string;
  client_id: string;
  message_content: string;
  caller_name: string;
  caller_phone: string;
  date_time: string;
  created_at: string;
}

export interface Bots {
  id: string;
  client_id: string;
  client_name: string;
  inbound_bot: boolean;
  confirmation_bot: boolean;
  reactivation_bot: boolean;
  lead_bot: boolean;
  created_at: string;
  updated_at: string;
}

export interface RetellConfig {
  id: string;
  client_id: string;
  client_name: string;
  inbound_agent_id: string | null;
  outbound_agent_id: string | null;
  retell_api: string;
  created_at: string;
  updated_at: string;
}

// Retell API types
export interface RetellCall {
  call_id: string;
  agent_id: string;
  agent_version: number;
  agent_name?: string;
  call_status: "registered" | "not_connected" | "ongoing" | "ended" | "error";
  call_type: "phone_call" | "web_call";
  direction: "inbound" | "outbound";
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  transcript?: string;
  recording_url?: string;
  disconnection_reason?: string;
  from_number?: string;
  to_number?: string;
  telephony_identifier?: {
    twilio_call_sid?: string;
  };
  call_analysis?: {
    sentiment?: string;
    summary?: string;
    call_summary?: string;
    in_voicemail?: boolean;
    user_sentiment?: string;
    call_successful?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  collected_dynamic_variables?: {
    firstName?: string;
    lastName?: string;
    [key: string]: unknown;
  };
  retell_llm_dynamic_variables?: Record<string, unknown>;
  custom_sip_headers?: Record<string, string>;
  data_storage_setting?: string;
  opt_in_signed_url?: boolean;
  opt_out_sensitive_data_storage?: boolean;
  transcript_object?: Array<{
    role: string;
    content: string;
    words?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
    metadata?: Record<string, unknown>;
  }>;
  transcript_with_tool_calls?: Array<{
    role: string;
    content: string;
    words?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
    metadata?: Record<string, unknown>;
  }>;
  scrubbed_transcript_with_tool_calls?: Array<{
    role: string;
    content: string;
    words?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
    metadata?: Record<string, unknown>;
  }>;
  recording_multi_channel_url?: string;
  scrubbed_recording_url?: string;
  scrubbed_recording_multi_channel_url?: string;
  public_log_url?: string;
  knowledge_base_retrieved_contents_url?: string;
  latency?: Record<
    string,
    {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
      max: number;
      min: number;
      num: number;
      values: number[];
    }
  >;
  call_cost?: {
    product_costs: Array<{
      product: string;
      unit_price: number;
      cost: number;
    }>;
    total_duration_seconds: number;
    total_duration_unit_price: number;
    combined_cost: number;
  };
  llm_token_usage?: {
    values: number[];
    average: number;
    num_requests: number;
  };
}

export interface RetellListCallsResponse {
  calls: RetellCall[];
  pagination_key?: string;
}
