
import React, { useState, useEffect } from 'react';
import styles from '@/styles/CreditCardAnimation.module.css';
import { CreditCard as CreditCardIcon } from 'lucide-react';

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
  const [preloadClass, setPreloadClass] = useState(styles.preload);
  
  // Remove preload class after initial render to enable animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreloadClass('');
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Automatically flip card when focusing on CVV and flip back when focusing other fields
  useEffect(() => {
    if (onFlip) {
      onFlip(isFlipped);
    }
  }, [isFlipped, onFlip]);
  
  // Detect card type from number
  useEffect(() => {
    const detectedType = detectCardType(cardNumber);
    if (detectedType !== cardType) {
      setCardType(detectedType);
    }
  }, [cardNumber, cardType]);
  
  useEffect(() => {
    setIsFlipped(Boolean(cvv));
  }, [cvv]);
  
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
    const dinersPattern = /^3(?:0[0-5]|[68])/;
    const jcbPattern = /^(?:2131|1800|35)/;
    const unionPayPattern = /^62/;
    const israeliCardPattern = /^(448|449|458|455|601)/; // IsraCard/Cal
    
    if (visaPattern.test(cleanNumber)) return 'visa';
    if (mastercardPattern.test(cleanNumber)) return 'mastercard';
    if (amexPattern.test(cleanNumber)) return 'amex';
    if (discoverPattern.test(cleanNumber)) return 'discover';
    if (dinersPattern.test(cleanNumber)) return 'diners';
    if (jcbPattern.test(cleanNumber)) return 'jcb';
    if (unionPayPattern.test(cleanNumber)) return 'unionpay';
    if (israeliCardPattern.test(cleanNumber)) return 'isracard';
    
    return 'unknown';
  };
  
  // Format display values with proper spacing and masking
  const formatCardNumber = () => {
    if (!cardNumber) return 'XXXX XXXX XXXX XXXX';
    
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    let formattedNumber = '';
    let mask = '•';
    
    // Format based on card type (AMEX uses 4-6-5 format, others use 4-4-4-4)
    if (cardType === 'amex') {
      // If AMEX (format as 4-6-5)
      if (cleanNumber.length <= 4) {
        formattedNumber = cleanNumber.padEnd(4, mask);
      } else if (cleanNumber.length <= 10) {
        formattedNumber = cleanNumber.slice(0, 4) + ' ' + cleanNumber.slice(4).padEnd(6, mask);
      } else {
        formattedNumber = cleanNumber.slice(0, 4) + ' ' + cleanNumber.slice(4, 10) + ' ' + cleanNumber.slice(10).padEnd(5, mask);
      }
      
      // Limit to 15 digits for AMEX (4-6-5 with spaces)
      if (formattedNumber.length > 17) {
        formattedNumber = formattedNumber.substring(0, 17);
      }
    } else {
      // For all other cards (format as 4-4-4-4)
      for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) formattedNumber += ' ';
        formattedNumber += (i < cleanNumber.length) ? cleanNumber[i] : mask;
      }
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
      case 'discover': 
      case 'diners': return 'purple';
      case 'jcb':
      case 'unionpay': return 'yellow';
      case 'isracard': return 'orange';
      default: return 'purple'; // Premium default color
    }
  };
  
  // Render card logo based on type
  const renderCardLogo = () => {
    switch (cardType) {
      case 'visa':
        return (
          <div className={styles.cardLogo}>
            <img 
              src="/lovable-uploads/18900a56-e20a-4661-87e3-bf683352c6b2.png" 
              alt="Visa" 
              className="h-full w-full object-contain"
            />
          </div>
        );
      case 'mastercard':
        return (
          <div className={styles.cardLogo}>
            <img 
              src="/lovable-uploads/58e8c628-c57e-4dcd-9d49-b49b003649b6.png" 
              alt="Mastercard" 
              className="h-full w-full object-contain"
            />
          </div>
        );
      case 'amex':
        return (
          <div className={styles.cardLogo}>
            <img 
              src="/lovable-uploads/840c9674-65e7-4be8-a96d-f684992af891.png" 
              alt="American Express" 
              className="h-full w-full object-contain"
            />
          </div>
        );
      default:
        return (
          <div className={styles.cardLogo}>
            <CreditCardIcon className="text-white h-8 w-full" />
          </div>
        );
    }
  };
  
  const colorClass = getCardColorClass();
  
  return (
    <div className={`${styles.container} ${preloadClass}`}>
      <div 
        className={`${styles.creditcard} ${isFlipped ? styles.flipped : ''}`} 
        onClick={flipCard}
      >
        <div className={styles.front}>
          {renderCardLogo()}
          <div className={styles.chip}></div>
          <div className={styles.contactless}></div>
          <svg version="1.1" id="cardfront" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px" y="0px" viewBox="0 0 750 471" xmlSpace="preserve" width="100%" height="100%">
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
              <text transform="matrix(1 0 0 1 54.1064 390.5723)" id="svgname" className={`${styles.st2} ${styles.st5} ${styles.st6}`}>{formatName()}</text>
              <text transform="matrix(1 0 0 1 54.1074 370.8793)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>שם בעל הכרטיס</text>
              <text transform="matrix(1 0 0 1 479.7754 370.8793)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>תוקף</text>
              <text transform="matrix(1 0 0 1 65.1054 241.5)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>מספר כרטיס</text>
              <g>
                <text transform="matrix(1 0 0 1 574.4219 388.1095)" id="svgexpire" className={`${styles.st2} ${styles.st5} ${styles.st9}`}>{formatExpiry()}</text>
                <text transform="matrix(1 0 0 1 479.3848 376.0097)" className={`${styles.st2} ${styles.st10} ${styles.st11}`}>VALID</text>
                <text transform="matrix(1 0 0 1 479.3848 386.6762)" className={`${styles.st2} ${styles.st10} ${styles.st11}`}>THRU</text>
                <polygon className={styles.st2} points="554.5,370 540.4,364.2 540.4,376.9" />
              </g>
            </g>
          </svg>
        </div>
        <div className={styles.back}>
          <svg version="1.1" id="cardback" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px" y="0px" viewBox="0 0 750 471" xmlSpace="preserve" width="100%" height="100%">
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
              <text transform="matrix(1 0 0 1 621.999 227.2734)" id="svgsecurity" className={`${styles.st6back} ${styles.st7back}`}>{cvv || "•••"}</text>
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
