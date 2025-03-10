import React, { useState } from 'react';
import EnhancedStatisticsCalculator from './enhancedCalculator';
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

interface StatisticsCalculatorStandaloneProps {
  fileId: string;
  userId: string;
  onColumnAdded?: () => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

const StatisticsCalculatorStandalone: React.FC<StatisticsCalculatorStandaloneProps> = ({
  fileId,
  userId,
  onColumnAdded,
  buttonClassName = "",
  buttonVariant = "outline"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const openCalculator = () => setIsOpen(true);
  const closeCalculator = () => setIsOpen(false);

  return (
    <>
      <Button 
        onClick={openCalculator} 
        variant={buttonVariant}
        className={buttonClassName}
      >
        <Calculator className="mr-2 h-4 w-4" />
        Column Calculator
      </Button>

      <EnhancedStatisticsCalculator
        isOpen={isOpen}
        onClose={closeCalculator}
        fileId={fileId}
        userId={userId}
        onColumnAdded={onColumnAdded}
      />
    </>
  );
};

export default StatisticsCalculatorStandalone;