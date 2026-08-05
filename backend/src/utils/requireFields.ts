import { NextFunction, Request, Response } from "express";

/** Responds 400 listing whichever of the given body fields are missing or falsy. */
export function requireFields(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter((field) => !req.body?.[field]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `${missing.join(", ")} required` });
    }
    next();
  };
}
