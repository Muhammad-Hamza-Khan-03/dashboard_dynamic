import {toast} from "sonner"
import { client } from "@/lib/hono"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { InferRequestType, InferResponseType } from "hono"


type ResponseType = InferResponseType<typeof client.api.accounts[":id"]["$patch"]>;
type RequestType = InferRequestType<typeof client.api.accounts[":id"]["$patch"]>["json"];

export const useEditAccount = (id?:string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        ResponseType,
        Error,
        RequestType
    >
        ({
            mutationFn: async (json) => {
                const response = await client.api.accounts[":id"]["$patch"]({ json,param:{id} });
                if (!response.ok)
                {
                    throw new Error(await response.text());
                }
                return await response.json();
            },
            onSuccess: () => {
                toast.success("Account Updated")
                queryClient.invalidateQueries({ queryKey: ["account", {id}] });
                queryClient.invalidateQueries({ queryKey: ["accounts"] });
            
            },
            onError: () => {
                toast.error("Failed to update account");
            }
        });
    return mutation;
}