import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateAppointment as useGeneratedCreateAppointment,
  getListAppointmentsQueryKey,
  getGetAvailableSlotsQueryKey 
} from "@workspace/api-client-react";

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  
  return useGeneratedCreateAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAvailableSlotsQueryKey() });
      }
    }
  });
}
