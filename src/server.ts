import express from "express";
import dotenv from "dotenv";
import morgan from "morgan"; 
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import eventRoutes from "./routes/event.routes";
import participantRoutes from "./routes/participant.routes";
import hostRoutes from "./routes/host.routes";
import errorHandler from "./middlewares/errorHandler.middleware";
import { setupSwagger } from "./config/swagger.config";

dotenv.config();
const PORT = process.env.PORT

const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000", // your frontend URL
  credentials: true
}));
app.use(cookieParser());
app.use(morgan("dev"));

// Auth Route
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/event", eventRoutes);
app.use("/api/participant", participantRoutes);
app.use("/api/host", hostRoutes);

// Health Check
app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Unhandle Error
app.use(errorHandler);

if (process.env.ENV === "development"){
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

setupSwagger(app);

export default app;