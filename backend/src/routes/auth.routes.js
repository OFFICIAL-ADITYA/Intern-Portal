import { Router } from "express";
import { loginValidator } from "../validators/auth.validator.js";
import {
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import verifyAuth from "../middlewares/verifyAuth.js";
import {
  loginLimiter,
  forgotPasswordLimiter,
  passwordLimiter,
} from "../middlewares/rateLimiter.js";

const authRouter = Router();

// POST api/auth/login
authRouter.post("/login", loginLimiter, loginValidator, login);

// POST api/auth/logout
authRouter.post("/logout", verifyAuth, logout);

authRouter.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

authRouter.post("/reset-password/:token", passwordLimiter, resetPassword);

authRouter.get("/get-me", verifyAuth, getMe);

export default authRouter;