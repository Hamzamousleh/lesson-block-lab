import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const joinSessionFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        code: z.string().min(1).max(20),
        participant_token: z.string().min(10).max(120).nullish(),
        rotate_alias: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { joinSessionByCode } = await import("./session.server");
    return joinSessionByCode(data);
  });

export const peekSessionFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { peekSessionByCode } = await import("./session.server");
    return peekSessionByCode(data.code);
  });

export const studentStateFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ participant_token: z.string().min(10).max(120) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getStudentState } = await import("./session.server");
    return getStudentState(data.participant_token);
  });

export const studentMaterialsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        participant_token: z.string().min(10).max(120),
        block_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getStudentMaterials } = await import("./session.server");
    return getStudentMaterials(data);
  });

export const submitResponseFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        participant_token: z.string().min(10).max(120),
        block_id: z.string().uuid(),
        response_data: z.record(z.string(), z.unknown()),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { submitStudentResponse } = await import("./session.server");
    return submitStudentResponse(data);
  });

export const setProgressFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        participant_token: z.string().min(10).max(120),
        progress_index: z.number().int().min(0).max(500),
        completed: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { setStudentProgress } = await import("./session.server");
    return setStudentProgress(data);
  });
