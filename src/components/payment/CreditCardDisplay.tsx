
import React, { useState, useEffect } from 'react';
import styles from '@/styles/CreditCardAnimation.module.css';
import { CreditCard as CreditCardIcon } from 'lucide-react';

// Custom SVG components for card types
const VisaLogo = () => (
  <svg className="text-white h-8 w-auto" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M278.2,334.3h-55.7l34.8-203.2h55.7L278.2,334.3z" fill="white"/>
    <path d="M524.3,142.1c-11-4.3-28.5-8.9-50.2-8.9c-55.3,0-94.2,27.8-94.5,67.8c-0.3,29.5,27.8,46,49,55.8
      c21.8,10.1,29.1,16.5,29,25.5c-0.1,13.8-17.4,20.1-33.5,20.1c-22.4,0-34.3-3.1-52.6-10.8l-7.2-3.3l-7.9,46c13.1,5.7,37.4,10.7,62.6,11
      c59.1,0,97.4-27.5,97.9-70.2c0.3-23.4-14.8-41.2-47.3-55.8c-19.7-9.5-31.7-15.8-31.6-25.4c0-8.5,10.2-17.6,32.1-17.6
      c18.3-0.3,31.6,3.7,41.9,7.9l5,2.4L524.3,142.1" fill="white"/>
    <path d="M661.3,131.1h-43c-13.3,0-23.3,3.6-29.2,16.8l-82.7,186.4h58.5c0,0,9.6-25.2,11.7-30.7
      c6.4,0,63.2,0.1,71.3,0.1c1.7,7.2,6.7,30.6,6.7,30.6h51.7L661.3,131.1 M587.4,262.1c4.6-11.8,22.2-57.1,22.2-57.1
      c-0.3,0.5,4.6-11.9,7.4-19.6l3.8,17.6c0,0,10.7,48.5,12.9,59.1H587.4L587.4,262.1z" fill="white"/>
    <path d="M207.8,131.1l-54.5,139.2l-5.8-28.5c-10.2-32.6-41.8-67.9-77.3-85.6l50,177.7l59.1-0.1l87.8-202.8
      L207.8,131.1" fill="white"/>
    <path d="M131.9,131.1H42.1l-0.9,3.9c69.8,16.9,116,57.7,135.1,106.9L156.3,149C152.5,136.3,143.1,131.7,131.9,131.1" fill="#DCB35C"/>
  </svg>
);

const MastercardLogo = () => (
  <svg className="text-white h-8 w-auto" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M434.9,235.5c0,99.1-80.4,179.5-179.5,179.5s-179.5-80.4-179.5-179.5s80.4-179.5,179.5-179.5
      S434.9,136.3,434.9,235.5" fill="#D9222A"/>
    <path d="M495.5,235.5c0,99.1-80.4,179.5-179.5,179.5c-39.3,0-75.5-12.6-105-34c45.3-33,74.7-86.5,74.7-146.5
      c0-60-29.4-113.5-74.7-146.5c29.5-21.4,65.7-34,105-34C415.1,56,495.5,136.3,495.5,235.5z" fill="#EE9F2D"/>
    <path d="M651.9,335.5c0-3.3,2.7-6,6-6s6,2.7,6,6s-2.7,6-6,6S651.9,338.8,651.9,335.5z M663.4,335.5
      c0-3-2.2-5.5-5.4-5.5c-3.2,0-5.4,2.5-5.4,5.5s2.2,5.5,5.4,5.5C661.1,341,663.4,338.5,663.4,335.5z M658.9,338.7h-1.1v-6.5
      c0.4-0.1,1-0.2,1.8-0.2c1,0,1.4,0.2,1.8,0.4c0.3,0.2,0.6,0.6,0.6,1.1c0,0.6-0.5,1-1.1,1.2v0.1c0.5,0.2,0.8,0.6,1,1.3
      c0.2,0.8,0.3,1.1,0.4,1.3h-1.2c-0.2-0.2-0.3-0.6-0.4-1.2c-0.1-0.5-0.5-0.8-1.2-0.8h-0.5V338.7z M659,335.8h0.5
      c0.7,0,1.3-0.2,1.3-0.8c0-0.5-0.4-0.8-1.2-0.8c-0.3,0-0.5,0-0.6,0.1V335.8z" fill="#000000"/>
    <path d="M332.6,321.1v-3.6c-0.1-1.3,0.8-2,2-2c0.8-0.1,1.7,0.5,1.9,1.3c0.8-0.8,1.7-1.3,2.8-1.3
      c1.1,0,2.2,0.7,2.2,2.3v3.4h-1.3v-3.2c0-1-0.4-1.4-1.3-1.4c-0.8,0-1.4,0.5-1.8,1.1c0,0.2,0,0.4,0,0.5v3h-1.3v-3.2
      c0-1-0.5-1.4-1.3-1.4c-0.8,0-1.4,0.5-1.8,1.1v3.5H332.6" fill="#000000"/>
    <path d="M347.2,315.7c1.3,0,2.2,0.3,3,0.9l-0.6,0.8c-0.6-0.4-1.4-0.7-2.2-0.7c-1.7,0-2.9,1.2-2.9,3.6
      c0,2.3,1.2,3.6,2.8,3.6c1,0,1.9-0.4,2.4-0.8l0.6,0.8c-0.8,0.7-1.9,1-3.1,1c-2.5,0-4.2-1.8-4.2-4.7
      C343,317.6,344.7,315.7,347.2,315.7" fill="#000000"/>
    <path d="M355.5,315.7c2.4,0,4,1.9,4,4.6c0,2.7-1.6,4.6-4,4.6s-4-1.9-4-4.6C351.5,317.6,353.1,315.7,355.5,315.7
       M355.5,323.9c1.4,0,2.6-1.2,2.6-3.6c0-2.4-1.2-3.6-2.6-3.6c-1.4,0-2.6,1.2-2.6,3.6C352.9,322.7,354.1,323.9,355.5,323.9"
      fill="#000000"/>
    <path d="M362.5,316.3v-2.1h1.3v2.1h1.7v1h-1.7v4.3c0,0.7,0.3,1.1,0.9,1.1c0.2,0,0.5-0.1,0.8-0.2l0.3,0.9
      c-0.4,0.2-0.8,0.3-1.4,0.3c-1.5,0-1.9-1-1.9-2.1v-4.3h-1v-1H362.5" fill="#000000"/>
    <path d="M366.9,312.4h1.3v3.1c0.6-0.5,1.4-0.9,2.3-0.9c1.8,0,2.8,1.2,2.8,3v3.4H372v-3.2c0-1.4-0.7-2.1-1.9-2.1
      c-1,0-1.8,0.5-2.3,1.1v4.2h-1.3V312.4" fill="#000000"/>
    <path d="M376.9,318.7c0-2.7,1.9-3.1,3.4-3.1c0.6,0,1.2,0.1,1.8,0.2v-0.2c0-1-0.6-1.9-2.1-1.9
      c-0.8,0-1.6,0.2-2.2,0.6l-0.4-0.9c0.8-0.4,1.8-0.7,2.8-0.7c2.1,0,3.2,1.3,3.2,3v4.6c0,0.3,0.1,0.8,0.2,0.8h-1.2
      c-0.1-0.2-0.1-0.5-0.1-0.8c-0.6,0.6-1.5,1-2.4,1C377.9,321.1,376.9,320.1,376.9,318.7 M382,319.3v-2.5c-0.4-0.1-1.1-0.2-1.8-0.2
      c-1.1,0-2.1,0.4-2.1,1.9c0,1.1,0.7,1.6,1.7,1.6C380.7,320.2,381.5,319.8,382,319.3" fill="#000000"/>
    <path d="M388.9,315.7c2.4,0,3.4,1.8,3.4,4.2c0,0.2,0,0.4,0,0.6h-5.7c0.1,1.9,1.2,2.7,2.7,2.7c0.8,0,1.6-0.3,2.1-0.7
      l0.5,0.8c-0.7,0.5-1.7,0.8-2.8,0.8c-2.3,0-3.9-1.6-3.9-4.3C385.3,317.6,386.8,315.7,388.9,315.7 M386.8,319.5h4.4
      c0-1.4-0.6-2.8-2.3-2.8C387.6,316.7,386.8,318,386.8,319.5" fill="#000000"/>
    <path d="M394.9,312.4h1.3v8.6h-1.3V312.4z" fill="#000000"/>
    <path d="M401.8,315.7c2.4,0,3.4,1.8,3.4,4.2c0,0.2,0,0.4,0,0.6h-5.7c0.1,1.9,1.2,2.7,2.7,2.7c0.8,0,1.6-0.3,2.1-0.7
      l0.5,0.8c-0.7,0.5-1.7,0.8-2.8,0.8c-2.3,0-3.9-1.6-3.9-4.3C398.2,317.6,399.6,315.7,401.8,315.7 M399.6,319.5h4.4
      c0-1.4-0.6-2.8-2.3-2.8C400.5,316.7,399.6,318,399.6,319.5" fill="#000000"/>
    <path d="M407.7,315.8h1.3v1.4c0.5-0.8,1.3-1.6,2.5-1.6c1.5,0,2.4,0.8,2.4,2.6v2.8h-1.3v-2.7c0-1.3-0.7-1.7-1.6-1.7
      c-1,0-1.8,0.7-2.1,1.4v3h-1.3V315.8" fill="#000000"/>
    <path d="M418.9,320.2c0.9,0,1.7-0.7,1.7-1.9v-0.2c-0.4,0-0.7,0-1.1,0c-1.1,0-1.9,0.4-1.9,1.2
      C417.6,319.9,418.2,320.2,418.9,320.2 M418.7,321.1c-1.2,0-2.4-0.6-2.4-1.9c0-1.4,1.4-2,2.9-2c0.4,0,0.8,0,1.3,0.1v-0.1
      c0-1-0.7-1.5-1.8-1.5c-0.7,0-1.3,0.2-1.8,0.5l-0.4-0.9c0.7-0.4,1.5-0.6,2.3-0.6c1.8,0,3,0.9,3,2.8v2.3c0,0.6,0,1,0.1,1.4h-1.2
      c-0.1-0.3-0.1-0.6-0.1-0.9C420.3,320.8,419.5,321.1,418.7,321.1" fill="#000000"/>
    <path d="M424.2,315.8h1.3v1.2c0.5-0.7,1.3-1.4,2.4-1.4c1.1,0,1.8,0.5,2.2,1.4c0.6-0.8,1.5-1.4,2.6-1.4
      c1.6,0,2.5,1,2.5,3v2.4h-1.3v-2.3c0-1.4-0.5-2.1-1.6-2.1c-0.9,0-1.6,0.6-2,1.2c0,0.2,0,0.4,0,0.6v2.6h-1.3v-2.3
      c0-1.4-0.5-2.1-1.6-2.1c-0.9,0-1.6,0.6-2,1.3v3.1h-1.3V315.8" fill="#000000"/>
    <path d="M437.9,318.4c0-2,1.4-2.7,3.2-2.7c0.6,0,1.1,0.1,1.5,0.2v-0.3c0-1-0.6-1.4-1.7-1.4c-0.8,0-1.5,0.2-2,0.5
      l-0.4-0.9c0.7-0.4,1.6-0.6,2.5-0.6c1.9,0,2.9,1,2.9,2.6v3.3c0,0.6,0,1,0.1,1.4h-1.2c-0.1-0.3-0.1-0.6-0.1-0.9
      c-0.5,0.6-1.2,1.1-2.3,1.1C439,320.5,437.9,319.8,437.9,318.4 M442.6,319v-2.2c-0.3-0.1-0.8-0.2-1.5-0.2c-1.1,0-1.9,0.5-1.9,1.5
      c0,0.9,0.6,1.4,1.5,1.4C441.5,319.6,442.1,319.4,442.6,319" fill="#000000"/>
    <path d="M447,315.8h1.3v1.2c0.6-0.8,1.4-1.4,2.5-1.4c1.7,0,2.6,1.1,2.6,2.9v2.6h-1.3v-2.5c0-1.2-0.5-2-1.7-2
      c-1,0-1.7,0.7-2.1,1.3v3.2H447V315.8" fill="#000000"/>
    <path d="M455.4,319.2c0-1.6,1.3-2.4,4.1-2.7c0-0.9-0.4-1.6-1.5-1.6c-0.8,0-1.5,0.4-2,0.7l-0.5-0.8
      c0.7-0.5,1.7-0.9,2.7-0.9c1.9,0,2.7,1.2,2.7,3v2.4c0,0.6,0,1.1,0.1,1.6h-1.2c-0.1-0.4-0.1-0.7-0.1-1.1c-0.5,0.7-1.3,1.2-2.4,1.2
      C456.3,321.1,455.4,320.4,455.4,319.2 M459.5,319.6v-2.2c-1.9,0.2-2.8,0.8-2.8,1.8c0,0.8,0.5,1.2,1.3,1.2
      C458.6,320.3,459.1,320,459.5,319.6" fill="#000000"/>
    <path d="M304.4,270.7c0-26.2,16.4-48.5,39.4-57.2c-9.6-7.5-21.7-12.1-34.8-12.1c-31.4,0-56.8,25.4-56.8,56.8
      c0,31.4,25.4,56.8,56.8,56.8c13.1,0,25.2-4.5,34.8-12.1C320.8,319.2,304.4,296.9,304.4,270.7" fill="#000000"/>
    <path d="M340.4,213.5c-13.1,0-25.2,4.5-34.8,12.1c22.9,8.7,39.4,31,39.4,57.2c0,26.2-16.4,48.5-39.4,57.2
      c9.6,7.5,21.7,12.1,34.8,12.1c31.4,0,56.8-25.4,56.8-56.8C397.2,238.9,371.8,213.5,340.4,213.5" fill="#000000"/>
    <path d="M327.8,270.7c0-26.2-16.4-48.5-39.4-57.2c-22.9,8.7-39.4,31-39.4,57.2c0,26.2,16.4,48.5,39.4,57.2
      C311.4,319.2,327.8,296.9,327.8,270.7" fill="#000000"/>
  </svg>
);

const AmexLogo = () => (
  <svg className="text-white h-8 w-auto" viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,41h750v390H0V41z" fill="#2557D6"/>
    <path 
      d="M327.9,243l-11.6-29.4l-11.4,29.4H327.9z M524.1,280.1h26l-29.4-71.5h-21.5l-29.1,71.5h26l5.5-14.4h18.1 L524.1,280.1z M395.8,208.6l17.3,41.8h-18.3L395.8,208.6z M402.5,280.1h24.8l3.4-9.4h29.2l3.7,9.4h26.7l-27.5-71.5h-25.9 L402.5,280.1z M614.9,208.6l14.1,41.8h-15.7L614.9,208.6z M620.7,280.1h28.3l5.5-15h21.1l5.8,15h26.7l-27.5-71.5h-32.4 L620.7,280.1z M191.9,280.1h30.6v-18.1h33.3v-14.9h-33.3v-9h40v-16.5h-70.7V280.1z M321.9,280.1h30.6v-18.1h33.3v-14.9h-33.3v-9 h40v-16.5h-70.7V280.1z M487.8,208.6v13.8h28.7v58h24.7v-58h28.8v-13.8H487.8z M674.4,208.6v13.8h28.7v58h24.7v-58h28.8v-13.8 H674.4z M148,221.2c8.3,0,13.1,4.3,13.1,11.2c0,7-4.8,11.2-13.1,11.2h-30.6v-22.4H148z M98.5,280.1h19v-19.5h29.5 c17.7,0,31.3-9.9,31.3-29.1c0-19.1-12.5-29.9-30.2-29.9H98.5V280.1z" 
      fill="#ffffff"
    />
  </svg>
);

const DiscoverLogo = () => (
  <svg className="text-white h-8 w-auto" viewBox="0 0 780 501" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4D4D4D" d="M55,0L55,0h671c30,0,54,24,54,55v391c0,30-24,55-54,55H55c-30,0-55-24-55-55V55C0,25,24,0,55,0z"/>
    <path fill="#F47216" d="M415,286c42,0,76-34,76-75s-34-75-76-75s-76,34-76,75S373,286,415,286z"/>
    <rect x="507.8" y="143.2" fill="#FFFFFF" width="24.6" height="114.4"/>
    <path fill="#FFFFFF" d="M585,195c-9-7-13-11-13-18c0-9,8-16,19-16c6,0,11,2,16,7l2,1l15-20l-1-1c-9-8-20-12-31-12   c-26,0-45,18-45,41c0,17,8,29,24,41c3,2,7,5,10,8c12,9,15,15,15,24c0,10-8,16-21,16c-9,0-18-3-26-10l-2-2l-17,19l1,1   c11,10,26,16,42,16c30,0,49-17,49-45C623,222,609,212,585,195z"/>
    <path fill="#FFFFFF" d="M662,118c-31,0-56,25-56,56c0,32,25,57,56,57s56-25,56-57C718,143,693,118,662,118z M662,209   c-19,0-35-16-35-35c0-19,16-35,35-35s35,16,35,35C697,193,682,209,662,209z"/>
    <path fill="#FFFFFF" d="M214,258h45l28-65c0,0,0,1,1,2c0,1,0,2,0,3c1,3,1,11,1,11v48h45V144h-45l-28,65c0,0,0-1-1-2   c0-1,0-2,0-3c-1-3-1-11-1-11v-48h-45V258z"/>
    <path fill="#FFFFFF" d="M455,209c0-33-25-59-58-59c-35,0-59,24-59,59c0,34,25,58,59,58C429,267,455,242,455,209z M398,242   c-18,0-32-14-32-33c0-18,14-33,32-33c17,0,30,15,30,33C428,228,415,242,398,242z"/>
    <path fill="#F47216" d="M140,152c8,0,14,4,19,10l2,2l20-20l-1-1c-11-11-24-16-40-16c-34,0-59,24-59,59c0,34,25,58,59,58   c16,0,29-5,41-17l1-1l-20-20l-2,2c-5,6-12,9-19,9c-18,0-32-14-32-33C107,166,122,152,140,152z"/>
  </svg>
);

interface CreditCardDisplayProps {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
  onFlip?: (flipped: boolean) => void;
}

const CreditCardDisplay: React.FC<CreditCardDisplayProps> = ({
  cardNumber,
  cardholderName,
  expiryDate,
  cvv,
  onFlip
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardType, setCardType] = useState('');
  
  // Automatically flip card when focusing on CVV and flip back when focusing other fields
  useEffect(() => {
    if (cvv && !isFlipped) {
      setIsFlipped(true);
    }
  }, [cvv, isFlipped]);
  
  // Notify parent component when card is flipped
  useEffect(() => {
    if (onFlip) {
      onFlip(isFlipped);
    }
  }, [isFlipped, onFlip]);
  
  // Detect card type from number and update
  useEffect(() => {
    const detectedType = detectCardType(cardNumber);
    if (detectedType !== cardType) {
      setCardType(detectedType);
    }
  }, [cardNumber, cardType]);
  
  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };
  
  const detectCardType = (number: string): string => {
    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber === '') return '';
    
    // Basic regex patterns for card type detection
    const visaPattern = /^4/;
    const mastercardPattern = /^5[1-5]/;
    const amexPattern = /^3[47]/;
    const discoverPattern = /^6(?:011|5)/;
    
    if (visaPattern.test(cleanNumber)) return 'visa';
    if (mastercardPattern.test(cleanNumber)) return 'mastercard';
    if (amexPattern.test(cleanNumber)) return 'amex';
    if (discoverPattern.test(cleanNumber)) return 'discover';
    
    return 'unknown';
  };
  
  // Format display values with proper spacing and masking
  const formatCardNumber = () => {
    if (!cardNumber) return 'XXXX XXXX XXXX XXXX';
    
    // Display with proper format
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    let formattedNumber = '';
    
    // Format based on card type (AMEX uses 4-6-5 format, others use 4-4-4-4)
    if (cardType === 'amex') {
      for (let i = 0; i < cleanNumber.length; i++) {
        if (i === 4 || i === 10) formattedNumber += ' ';
        formattedNumber += cleanNumber[i];
      }
    } else {
      for (let i = 0; i < cleanNumber.length; i++) {
        if (i > 0 && i % 4 === 0) formattedNumber += ' ';
        formattedNumber += cleanNumber[i];
      }
    }
    
    // Pad with X's if needed
    const totalLen = cardType === 'amex' ? 17 : 19; // Including spaces
    if (formattedNumber.length < totalLen) {
      formattedNumber = formattedNumber.padEnd(totalLen, 'X').replace(/X/g, '•');
    }
    
    return formattedNumber;
  };
  
  const formatName = () => {
    return cardholderName || 'YOUR NAME HERE';
  };
  
  const formatExpiry = () => {
    return expiryDate || 'MM/YY';
  };
  
  // Get color classes based on card type
  const getCardColorClass = () => {
    switch (cardType) {
      case 'visa': return 'lightblue';
      case 'mastercard': return 'red';
      case 'amex': return 'green';
      case 'discover': return 'purple';
      default: return 'grey';
    }
  };
  
  // Render card logo based on type
  const renderCardLogo = () => {
    switch (cardType) {
      case 'visa':
        return <VisaLogo />;
      case 'mastercard':
        return <MastercardLogo />;
      case 'amex':
        return <AmexLogo />;
      case 'discover':
        return <DiscoverLogo />;
      default:
        return <CreditCardIcon className="text-white h-8 w-auto" />;
    }
  };
  
  const colorClass = getCardColorClass();
  
  return (
    <div className={styles.container}>
      <div 
        className={`${styles.creditcard} ${isFlipped ? styles.flipped : ''}`} 
        onClick={flipCard}
      >
        <div className={styles.front}>
          <div className={styles.ccsingle}>
            {renderCardLogo()}
          </div>
          <svg version="1.1" id="cardfront" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px" y="0px" viewBox="0 0 750 471" xmlSpace="preserve">
            <g id="Front">
              <g id="CardBackground">
                <g id="Page-1_1_">
                  <g id="amex_1_">
                    <path id="Rectangle-1_1_" className={`${styles.lightcolor} ${styles[colorClass]}`} d="M40,0h670c22.1,0,40,17.9,40,40v391c0,22.1-17.9,40-40,40H40c-22.1,0-40-17.9-40-40V40
                    C0,17.9,17.9,0,40,0z" />
                  </g>
                </g>
                <path className={`${styles.darkcolor} ${styles[colorClass + 'dark']}`} d="M750,431V193.2c-217.6-57.5-556.4-13.5-750,24.9V431c0,22.1,17.9,40,40,40h670C732.1,471,750,453.1,750,431z" />
              </g>
              <text transform="matrix(1 0 0 1 60.106 295.0121)" id="svgnumber" className={`${styles.st2} ${styles.st3} ${styles.st4}`}>{formatCardNumber()}</text>
              <text transform="matrix(1 0 0 1 54.1064 428.1723)" id="svgname" className={`${styles.st2} ${styles.st5} ${styles.st6}`}>{formatName()}</text>
              <text transform="matrix(1 0 0 1 54.1074 389.8793)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>שם בעל הכרטיס</text>
              <text transform="matrix(1 0 0 1 479.7754 388.8793)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>תוקף</text>
              <text transform="matrix(1 0 0 1 65.1054 241.5)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>מספר כרטיס</text>
              <g>
                <text transform="matrix(1 0 0 1 574.4219 433.8095)" id="svgexpire" className={`${styles.st2} ${styles.st5} ${styles.st9}`}>{formatExpiry()}</text>
                <text transform="matrix(1 0 0 1 479.3848 417.0097)" className={`${styles.st2} ${styles.st10} ${styles.st11}`}>VALID</text>
                <text transform="matrix(1 0 0 1 479.3848 435.6762)" className={`${styles.st2} ${styles.st10} ${styles.st11}`}>THRU</text>
                <polygon className={styles.st2} points="554.5,421 540.4,414.2 540.4,427.9" />
              </g>
              <g id="cchip">
                <g>
                  <path className={styles.st2} d="M168.1,143.6H82.9c-10.2,0-18.5-8.3-18.5-18.5V74.9c0-10.2,8.3-18.5,18.5-18.5h85.3
                  c10.2,0,18.5,8.3,18.5,18.5v50.2C186.6,135.3,178.3,143.6,168.1,143.6z" />
                </g>
                <g>
                  <g>
                    <rect x="82" y="70" className={styles.st12} width="1.5" height="60" />
                  </g>
                  <g>
                    <rect x="167.4" y="70" className={styles.st12} width="1.5" height="60" />
                  </g>
                  <g>
                    <path className={styles.st12} d="M125.5,130.8c-10.2,0-18.5-8.3-18.5-18.5c0-4.6,1.7-8.9,4.7-12.3c-3-3.4-4.7-7.7-4.7-12.3
                    c0-10.2,8.3-18.5,18.5-18.5s18.5,8.3,18.5,18.5c0,4.6-1.7,8.9-4.7,12.3c3,3.4,4.7,7.7,4.7,12.3
                    C143.9,122.5,135.7,130.8,125.5,130.8z M125.5,70.8c-9.3,0-16.9,7.6-16.9,16.9c0,4.4,1.7,8.6,4.8,11.8l0.5,0.5l-0.5,0.5
                    c-3.1,3.2-4.8,7.4-4.8,11.8c0,9.3,7.6,16.9,16.9,16.9s16.9-7.6,16.9-16.9c0-4.4-1.7-8.6-4.8-11.8l-0.5-0.5l0.5-0.5
                    c3.1-3.2,4.8-7.4,4.8-11.8C142.4,78.4,134.8,70.8,125.5,70.8z" />
                  </g>
                  <g>
                    <rect x="82.8" y="82.1" className={styles.st12} width="25.8" height="1.5" />
                  </g>
                  <g>
                    <rect x="82.8" y="117.9" className={styles.st12} width="26.1" height="1.5" />
                  </g>
                  <g>
                    <rect x="142.4" y="82.1" className={styles.st12} width="25.8" height="1.5" />
                  </g>
                  <g>
                    <rect x="142" y="117.9" className={styles.st12} width="26.2" height="1.5" />
                  </g>
                </g>
              </g>
            </g>
          </svg>
        </div>
        <div className={styles.back}>
          <svg version="1.1" id="cardback" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px" y="0px" viewBox="0 0 750 471" xmlSpace="preserve">
            <g id="Front">
              <line className={styles.st0} x1="35.3" y1="10.4" x2="36.7" y2="11" />
            </g>
            <g id="Back">
              <g id="Page-1_2_">
                <g id="amex_2_">
                  <path id="Rectangle-1_2_" className={`${styles.lightcolor} ${styles[colorClass]}`} d="M40,0h670c22.1,0,40,17.9,40,40v391c0,22.1-17.9,40-40,40H40c-22.1,0-40-17.9-40-40V40
                  C0,17.9,17.9,0,40,0z" />
                </g>
              </g>
              <rect y="61.6" className={styles.st2} width="750" height="78" />
              <g>
                <path className={styles.st3back} d="M701.1,249.1H48.9c-3.3,0-6-2.7-6-6v-52.5c0-3.3,2.7-6,6-6h652.1c3.3,0,6,2.7,6,6v52.5
                C707.1,246.4,704.4,249.1,701.1,249.1z" />
                <rect x="42.9" y="198.6" className={styles.st4back} width="664.1" height="10.5" />
                <rect x="42.9" y="224.5" className={styles.st4back} width="664.1" height="10.5" />
                <path className={styles.st5back} d="M701.1,184.6H618h-8h-10v64.5h10h8h83.1c3.3,0,6-2.7,6-6v-52.5C707.1,187.3,704.4,184.6,701.1,184.6z" />
              </g>
              <text transform="matrix(1 0 0 1 621.999 227.2734)" id="svgsecurity" className={`${styles.st6back} ${styles.st7back}`}>{cvv}</text>
              <g className={styles.st8back}>
                <text transform="matrix(1 0 0 1 518.083 280.0879)" className={`${styles.st9back} ${styles.st6back} ${styles.st10back}`}>קוד אבטחה</text>
              </g>
              <rect x="58.1" y="378.6" className={styles.st11back} width="375.5" height="13.5" />
              <rect x="58.1" y="405.6" className={styles.st11back} width="421.7" height="13.5" />
              <text transform="matrix(1 0 0 1 59.5073 228.6099)" id="svgnameback" className={`${styles.st12back} ${styles.st13back}`}>{formatName()}</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default CreditCardDisplay;
