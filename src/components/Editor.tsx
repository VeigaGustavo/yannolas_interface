import { useId, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "./ui/button";
export interface Field {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  wide?: boolean;
}
export const options = (items: readonly string[]) =>
  items.map((value) => ({ value, label: value }));
export function Editor({
  fields,
  values,
  schema,
  save,
  close,
  extra,
  label = "Salvar",
}: {
  fields: Field[];
  values: Record<string, string>;
  schema: z.ZodObject<Record<string, z.ZodType<string, string>>>;
  save: (v: Record<string, string>) => Promise<unknown>;
  close?: () => void;
  extra?: ReactNode;
  label?: string;
}) {
  const prefix = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Record<string, string>>({
    defaultValues: values,
    resolver: zodResolver(schema),
  });
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await save(values);
          close?.();
        } catch (error) {
          setError("root", {
            message:
              error instanceof Error ? error.message : "Falha ao salvar.",
          });
        }
      })}
    >
      <div className="form-grid">
        {fields.map((f) => {
          const fieldId = prefix + f.name;
          const error = errors[f.name]?.message;
          const props = {
            ...register(f.name),
            id: fieldId,
            "aria-invalid": !!error,
            "aria-describedby": error ? fieldId + "-error" : undefined,
          };
          return (
            <div key={f.name} className={"field " + (f.wide ? "wide" : "")}>
              <label htmlFor={fieldId}>{f.label}</label>
              {f.options ? (
                <select {...props}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea {...props} />
              ) : (
                <input type={f.type || "text"} {...props} />
              )}{" "}
              {error && (
                <span
                  id={fieldId + "-error"}
                  className="field-error"
                  role="alert"
                >
                  {error}
                </span>
              )}
            </div>
          );
        })}
        {extra}
      </div>
      {errors.root && (
        <p className="field-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <div className="form-footer">
        {close && (
          <Button type="button" onClick={close}>
            Fechar
          </Button>
        )}
        <Button variant="default" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Salvando…" : label}
        </Button>
      </div>
    </form>
  );
}
export function fileData(file?: File): Promise<string> {
  if (!file) return Promise.resolve("");
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
      file.type,
    ) ||
    file.size > 1024 * 1024
  )
    return Promise.reject(
      new Error("Escolha uma imagem JPG, PNG, WEBP ou GIF de até 1 MB."),
    );
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(file);
  });
}
export const fileAccept = "image/jpeg,image/png,image/webp,image/gif";
