import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase.js";
import { sendDatabaseError } from "../../lib/api-error.js";

const subscriptionSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
});

export const newsletterRoutes = Router();
newsletterRoutes.post(
  "/",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_request, response) => {
      response
        .status(429)
        .json({ error: "Too many requests, please try again later." });
    },
  }),
  async (request, response) => {
    const parsed = subscriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: "Enter a valid email address.",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { data, error } = await getSupabaseClient().rpc("subscribe_newsletter", {
      p_email: parsed.data.email,
    });
    if (error) {
      sendDatabaseError(response, error);
      return;
    }
    if (!data) {
      response.status(500).json({ error: "Your subscription could not be saved." });
      return;
    }
    response.status(201).json({ subscribed: true });
  },
);
