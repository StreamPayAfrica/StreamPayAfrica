import { Request, Response } from "express";
import { requireFields } from "../../src/utils/requireFields";

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("requireFields", () => {
  it("calls next when all fields are present", () => {
    const next = jest.fn();
    const req = { body: { a: "1", b: "2" } } as unknown as Request;
    requireFields("a", "b")(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("responds 400 listing missing fields without calling next", () => {
    const next = jest.fn();
    const res = mockRes();
    const req = { body: { a: "1" } } as unknown as Request;
    requireFields("a", "b", "c")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "b, c required" });
  });

  it("treats a missing body as all fields missing", () => {
    const next = jest.fn();
    const res = mockRes();
    const req = {} as Request;
    requireFields("a")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "a required" });
  });
});
