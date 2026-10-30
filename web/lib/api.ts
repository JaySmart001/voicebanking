import { VoiceBankApiClient } from "@voicebanking/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const apiClient = new VoiceBankApiClient({ baseUrl: API_URL });
