import {toast} from "sonner"
import { client } from "@/lib/hono"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"


type ResponseType = InferResponseType<typeof client.api.accounts["bulk-delete"]["$post"]>;
type RequestType = InferRequestType<typeof client.api.accounts["bulk-delete"]["$post"]>["json"];

export const useBulkDeleteAccount = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        ResponseType,
        Error,
        RequestType
    >
        ({
            mutationFn: async (json) => {
                const response = await client.api.accounts["bulk-delete"]["$post"]({json});
                if (!response.ok)
                {
                    throw new Error(await response.text());
                }
                return await response.json();
            },
            onSuccess: () => {
                toast.success("Accounts deleted");
                queryClient.invalidateQueries({queryKey:["accounts"]})
           //TODO: invalidate summary
            },
            onError: () => {
                toast.error("Failed to delete account");
            }
        });
    return mutation;
}