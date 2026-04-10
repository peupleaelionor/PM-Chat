import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

/**
 * Factory that returns an Express middleware validating the request body
 * against a Zod schema. Sends a structured 400 on failure so clients
 * can surface meaningful error messages.
 */
export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Replace req.body with the parsed (and coerced) value so downstream
      // handlers always receive typed data.
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: "Échec de la validation",
          details: err.flatten().fieldErrors,
        });
        return;
      }
      next(err);
    }
  };
}

/**
 * Strips NUL bytes from all string fields in req.body to prevent injection
 * via embedded null characters. Applied globally before route handlers.
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = stripNulBytes(req.body) as Record<string, unknown>;
  }
  next();
}

function stripNulBytes(obj: unknown): unknown {
  if (typeof obj === "string") return obj.replace(/\0/g, "");
  if (Array.isArray(obj)) return obj.map(stripNulBytes);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, stripNulBytes(v)])
    );
  }
  return obj;
}
