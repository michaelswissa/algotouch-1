import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContractSectionProps {
  onContractSigned: (signed: boolean) => void;
  onBack?: () => void;
}

const ContractSection: React.FC<ContractSectionProps> = ({ 
  onContractSigned, 
  onBack 
}) => {
  const handleSignContract = () => {
    onContractSigned(true);
  };
  
  return (
    <div className="max-w-2xl mx-auto px-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>תנאי השירות</CardTitle>
          <CardDescription>
            אנא קרא/י בעיון את תנאי השירות וחתום/י במקום המיועד
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md h-64 overflow-auto">
            <h3 className="font-semibold mb-2">תנאים כלליים</h3>
            <p className="text-sm mb-3">
              זהו הסכם משפטי בין המשתמש לבין החברה. השימוש באתר ובשירותים כפוף לתנאים אלה.
            </p>
            {/* Additional contract terms would go here */}
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <input 
              type="checkbox" 
              id="accept-terms" 
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="accept-terms" className="text-sm font-medium">
              אני מאשר/ת שקראתי והבנתי את התנאים וההגבלות
            </label>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          {onBack && (
            <Button 
              variant="outline" 
              onClick={onBack}
            >
              חזור
            </Button>
          )}
          <Button onClick={handleSignContract}>
            אישור והמשך
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ContractSection;
