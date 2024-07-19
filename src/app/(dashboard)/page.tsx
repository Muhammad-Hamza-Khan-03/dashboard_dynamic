'use client'
import { Button } from "@/components/ui/button";
import { useNewAccount } from "@/providers/account/use-new-account";

export default function Home() {
  const { onOpen, onClose } = useNewAccount();
  return (
    <div>
      <Button onClick={onOpen}>
        Add an Account
    </Button>
    </div>
  );
}
