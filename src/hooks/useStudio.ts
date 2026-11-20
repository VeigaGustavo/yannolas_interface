import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studio } from "../services/studio";
import { useInterface } from "../stores/interface";
import { useSession } from "../stores/session";
import { tenants } from "../tenants";

export const useTenantId = () => useSession((s) => s.tenantId) ?? "yannis";
export const useTenant = () => tenants[useTenantId()];
const key = (tenant: string) => ["studio", tenant];

export const useStudio = () =>
  useQuery({ queryKey: key(useTenantId()), queryFn: studio.get });

export function useAction() {
  const client = useQueryClient();
  const tenant = useTenantId();
  const notify = useInterface((s) => s.notify);
  return useMutation({
    mutationFn: ({ run }: { run: () => Promise<unknown>; message?: string }) =>
      run(),
    onSuccess: async (_, input) => {
      await client.invalidateQueries({ queryKey: key(tenant) });
      if (input.message) notify(input.message);
    },
    onError: (error) =>
      notify(error.message || "Não foi possível concluir a ação."),
  });
}
