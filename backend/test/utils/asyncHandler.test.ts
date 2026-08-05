import { Request, Response } from "express";
import { asyncHandler } from "../../src/utils/asyncHandler";

describe("asyncHandler", () => {
  it("calls next with the rejection reason when the handler throws asynchronously", async () => {
    const error = new Error("boom");
    const next = jest.fn();
    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler({} as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("does not call next when the handler resolves", async () => {
    const next = jest.fn();
    const handler = asyncHandler(async (_req, res: Response) => {
      (res as any).sent = true;
    });
    const res = {} as Response;

    await handler({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res as any).sent).toBe(true);
  });
});
