import { z } from "zod";
export const required = z.string().trim().min(1, "Campo obrigatório");
export const date = z.iso.date("Informe uma data válida");
export const number = (min: number, max = Infinity) =>
  required.refine(
    (v) => Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max,
    "Valor fora do intervalo",
  );
export const clientSchema = z.object({
  name: required,
  phone: required.refine(
    (v) => v.replace(/\D/g, "").length >= 10,
    "Telefone inválido",
  ),
  email: z.email("E-mail inválido").or(z.literal("")),
  project: required,
  tags: z.string(),
  birthday: z.string(),
  referredBy: z.string(),
});
export const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido");
