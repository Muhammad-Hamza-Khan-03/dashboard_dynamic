'use client'
import { Button } from "@/components/ui/button";
import { useNewAccount } from "@/providers/account/use-new-account";
import AccountsPage from "./accounts/page";

export default function Home() {
  const { onOpen, onClose } = useNewAccount();
  return (
    <div>
      <Button onClick={onOpen}>
        Add an Account
      </Button> 
      <div>
      <AccountsPage />
    </div>
      </div>
  );
}
