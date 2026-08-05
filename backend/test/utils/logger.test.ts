import { logger } from "../../src/utils/logger";

describe("logger", () => {
  const originalLevel = process.env.LOG_LEVEL;

  afterEach(() => {
    process.env.LOG_LEVEL = originalLevel;
    jest.restoreAllMocks();
  });

  it("writes info messages as structured JSON to stdout", () => {
    delete process.env.LOG_LEVEL;
    const spy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    logger.info("hello", { streamId: "abc" });

    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({ level: "info", message: "hello", streamId: "abc" });
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("writes errors to stderr", () => {
    delete process.env.LOG_LEVEL;
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    logger.error("boom");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({
      level: "error",
      message: "boom",
    });
  });

  it("suppresses levels below the configured LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "warn";
    const spy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    logger.debug("should be suppressed");
    logger.info("also suppressed");

    expect(spy).not.toHaveBeenCalled();
  });
});
