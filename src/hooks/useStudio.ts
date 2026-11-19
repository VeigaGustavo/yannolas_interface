import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studio } from "../services/studio";
import { useInterface } from "../stores/interface";
const key = ["studio"];
export const useStudio = () => useQuery({ queryKey: key, queryFn: studio.get });
export function useAction() {
  const client = useQueryClient();
  const notify = useInterface((s) => s.notify);
  return useMutation({
    mutationFn: ({ run }: { run: () => Promise<unknown>; message?: string }) =>
      run(),
    onSuccess: async (_, input) => {
      await client.invalidateQueries({ queryKey: key });
      if (input.message) notify(input.message);
    },
    onError: (error) =>
      notify(error.message || "Não foi possível concluir a ação."),
  });
}
