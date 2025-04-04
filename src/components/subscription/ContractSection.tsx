
import React from 'react';
import DigitalContractForm from '@/components/DigitalContractForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface ContractSectionProps {
  selectedPlan: string;
  fullName: string;
  email?: string;
  onSign: (contractData: any) => void;
  onBack: () => void;
}

const ContractSection: React.FC<ContractSectionProps> = ({ 
  selectedPlan, 
  fullName,
  email,
  onSign, 
  onBack 
}) => {
  const { user, isAuthenticated } = useAuth();
  
  // Function to handle contract signing
  const handleSignContract = (contractData: any) => {
    if (!isAuthenticated && !sessionStorage.getItem('registration_data')) {
      // This is a fallback check - should not typically happen with proper flow
      toast.error('אנא התחבר למערכת כדי לחתום על ההסכם');
      return;
    }
    
    console.log('Contract signed, forwarding data to parent component');
    onSign(contractData);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-1 space-x-reverse rtl">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">חתימה על הסכם</CardTitle>
          </div>
          <CardDescription>
            אנא קרא את כל תנאי ההסכם בעיון לפני החתימה עליו
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            על מנת להשלים את תהליך ההרשמה, עליך לחתום דיגיטלית על הסכם הרישיון. 
            החתימה מחייבת מבחינה משפטית, ומאשרת שקראת והבנת את כל תנאי השימוש וההגבלות.
          </p>
        </CardContent>
      </Card>
      
      <DigitalContractForm 
        onSign={handleSignContract}
        planId={selectedPlan} 
        fullName={fullName}
        email={email}
      />
      
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={onBack}>
          חזור
        </Button>
      </div>
    </div>
  );
};

export default ContractSection;
