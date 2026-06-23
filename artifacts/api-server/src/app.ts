import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import router from "./routes";
import { logger } from "./lib/logger";

declare global {
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}

const SESSION_COOKIE = "sid";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.set("trust proxy", 1);
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  let sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!sid || typeof sid !== "string" || sid.length < 10) {
    sid = randomUUID();
    res.cookie(SESSION_COOKIE, sid, {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_MS,
      sameSite: "lax",
    });
  }
  req.sessionId = sid;
  next();
});

app.use("/api", router);

export default app;
