import { z } from "zod";
import { content } from "@/content";

const values = <T extends { value: string }>(options: readonly T[]) =>
  options.map((o) => o.value) as [T["value"], ...T["value"][]];

const tracking = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : null));

export const registrationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email()),
  gender: z.enum(values(content.form.gender.options)),
  ageGroup: z.enum(values(content.form.ageGroup.options)),
  area: z
    .enum(values(content.form.area.options))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  agreeAge: z.literal(true),
  agreePrivacy: z.literal(true),
  // ハニーポット：人間には見えない項目。値が入っていたらボットとみなす
  website: z.string().max(200).optional(),
  utmSource: tracking,
  utmMedium: tracking,
  utmCampaign: tracking,
  referrer: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});

export type RegistrationInput = z.input<typeof registrationSchema>;

export type RegisterResponse =
  | { status: "created" | "duplicate" }
  | { status: "invalid"; fields: string[] }
  | { status: "rate_limited" | "error" };
