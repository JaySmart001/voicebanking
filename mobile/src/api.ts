import { Platform } from "react-native";
import { VoiceBankApiClient } from "@voicebanking/shared";

/**
 * Physical devices and emulators can't reach "localhost" and mean the
 * backend host machine, not the device itself. Android's emulator maps the
 * host loopback to 10.0.2.2; a real device (or iOS simulator, which shares
 * the Mac's network) needs the host machine's LAN IP instead. Replace this
 * with your machine's LAN IP (e.g. http://192.168.1.23:4000) when testing
 * on a physical phone.
 */
const DEV_SERVER_HOST = Platform.select({
  android: "http://10.0.2.2:4000",
  default: "http://localhost:4000",
});

export const apiClient = new VoiceBankApiClient({
  baseUrl: DEV_SERVER_HOST ?? "http://localhost:4000",
});
