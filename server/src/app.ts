import cors from "cors";
import express from "express";
import { authRouter } from "./auth/routes";
import { bankRouter } from "./bank/routes";

const DEV_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/, // LAN IP, e.g. Expo Go on a physical device
  /^exp:\/\/.*$/, // Expo dev client
];

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || DEV_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))) {
          return callback(null, true);
        }
        callback(new Error(`Origin not allowed: ${origin}`));
      },
    })
  );
  app.use(express.json({ limit: "15mb" })); // voice samples are base64 PCM, can be a few MB

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRouter);
  app.use("/api/bank", bankRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
