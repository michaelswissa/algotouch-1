import React, { useState, useEffect } from 'react';
import styles from '@/styles/CreditCardAnimation.module.css';
import { CreditCard as CreditCardIcon } from 'lucide-react';

// Custom SVG components for card types
const VisaLogo = () => (
  <svg className="h-8 w-auto" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  <svg className="h-8 w-auto" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="255.4" cy="235.5" r="179.5" fill="#D9222A"/>
    <circle cx="495.5" cy="235.5" r="179.5" fill="#EE9F2D"/>
    <path d="M375.4,135c33.6,27.1,55.1,68.9,55.1,115.6c0,46.6-21.5,88.4-55.1,115.6c-33.6-27.1-55.1-68.9-55.1-115.6 C320.3,203.9,341.8,162.1,375.4,135z" fill="#D9222A" opacity="0.8"/>
    <path d="M651.9,335.5c0-3.3,2.7-6,6-6s6,2.7,6,6s-2.7,6-6,6S651.9,338.8,651.9,335.5z M663.4,335.5
      c0-3-2.2-5.5-5.4-5.5c-3.2,0-5.4,2.5-5.4,5.5s2.2,5.5,5.4,5.5C661.1,341,663.4,338.5,663.4,335.5z M658.9,338.7h-1.1v-6.5
      c0.4-0.1,1-0.2,1.8-0.2c1,0,1.4,0.2,1.8,0.4c0.3,0.2,0.6,0.6,0.6,1.1c0,0.6-0.5,1-1.1,1.2v0.1c0.5,0.2,0.8,0.6,1,1.3
      c0.2,0.8,0.3,1.1,0.4,1.3h-1.2c-0.2-0.2-0.3-0.6-0.4-1.2c-0.1-0.5-0.5-0.8-1.2-0.8h-0.5V338.7z M659,335.8h0.5
      c0.7,0,1.3-0.2,1.3-0.8c0-0.5-0.4-0.8-1.2-0.8c-0.3,0-0.5,0-0.6,0.1V335.8z" fill="#000000"/>
  </svg>
);

const AmexLogo = () => (
  <svg className="h-8 w-auto" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,41h750v390H0V41z" fill="#2557D6"/>
    <path 
      d="M327.9,243l-11.6-29.4l-11.4,29.4H327.9z M524.1,280.1h26l-29.4-71.5h-21.5l-29.1,71.5h26l5.5-14.4h18.1 L524.1,280.1z M395.8,208.6l17.3,41.8h-18.3L395.8,208.6z M402.5,280.1h24.8l3.4-9.4h29.2l3.7,9.4h26.7l-27.5-71.5h-25.9 L402.5,280.1z M614.9,208.6l14.1,41.8h-15.7L614.9,208.6z M620.7,280.1h28.3l5.5-15h21.1l5.8,15h26.7l-27.5-71.5h-32.4 L620.7,280.1z M191.9,280.1h30.6v-18.1h33.3v-14.9h-33.3v-9h40v-16.5h-70.7V280.1z M321.9,280.1h30.6v-18.1h33.3v-14.9h-33.3v-9 h40v-16.5h-70.7V280.1z M487.8,208.6v13.8h28.7v58h24.7v-58h28.8v-13.8H487.8z M674.4,208.6v13.8h28.7v58h24.7v-58h28.8v-13.8 H674.4z M148,221.2c8.3,0,13.1,4.3,13.1,11.2c0,7-4.8,11.2-13.1,11.2h-30.6v-22.4H148z M98.5,280.1h19v-19.5h29.5 c17.7,0,31.3-9.9,31.3-29.1c0-19.1-12.5-29.9-30.2-29.9H98.5V280.1z" 
      fill="#ffffff"
    />
  </svg>
);

const DiscoverLogo = () => (
  <svg className="h-8 w-auto" viewBox="0 0 780 501" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M55,0H725c30,0,55,25,55,55v391c0,30-25,55-55,55H55c-30,0-55-25-55-55V55C0,25,25,0,55,0z" fill="#4D4D4D"/>
    <path d="M415,211c0,41.4-33.6,75-75,75s-75-33.6-75-75s33.6-75,75-75S415,169.6,415,211z" fill="#F47216"/>
    <path fill="#FFFFFF" d="M220,233.8h-14.9v-35.6H220V233.8z M459.6,233.8h-14V182h14V233.8z M483.1,233.8h-15.5l-19.6-33v33h-15
      v-51.7h16.2l18.8,32.1v-32.1h15V233.8z M349.3,207.1c0,8.9-5.8,14-15.4,14c-9.5,0-15.4-5.1-15.4-14v-25.2h15v24
      c0,2,1,3.4,2.3,3.4s2.3-1.4,2.3-3.4v-24h11.2V207.1z M444.6,207.6c4.7,0,7.9,0.9,11.2,3.4l5.6-10.1c-5.2-4.2-11.7-5.4-17-5.4
      c-13.6,0-23.1,9.4-23.1,21.5c0,11.9,9.2,21.5,23.4,21.5c5.7,0,12.4-1.4,17-5.1l-5.3-10.4c-3.6,2.2-7.2,3.3-11.6,3.3
      c-6.1,0-10.6-4.3-10.6-9.4C434.2,211.7,438.6,207.6,444.6,207.6z M645.6,195.3h-15.8v8.3h14V214h-14v9.5h16v10.3h-31v-51.7h31
      V195.3z M220,195.3h-14.9v8.3h13.8V214h-13.8v19.7h-15v-51.7h30V195.3z M680.9,233.8h-31v-51.7h15v39.1h16V233.8z M568.6,221.2
      h-16.9l-2,12.6h-15.4l12.1-51.7h17.6l12.1,51.7h-5.2L568.6,221.2z M560.3,184l-5.2,27.1h10.3L560.3,184z M645.1,142.1
      c56.9,0,103,46.1,103,103s-46.1,103-103,103s-103-46.1-103-103S588.2,142.1,645.1,142.1z M512.1,233.8h-15v-51.7h15V233.8z
       M512.1,167.7h-15v-15.6h15V167.7z M412.9,210.1c0,19.2-9.5,24.9-25,24.9c-15.3,0-24.9-7.7-24.9-24.9v-28.1h15.1v27.1
      c0,9.3,2.9,14.2,10.1,14.2c7,0,9.8-5,9.8-14.2v-27.1h15V210.1z M245.6,211c0,14.4-9.7,23.5-25.3,23.5c-6.7,0-13.2-1.5-18.8-4.5
      v-22.9c3.3,3.8,11.1,7.7,16.8,7.7c5.2,0,8.4-2.1,8.4-5.5c0-10.2-25.6-9.2-25.6-27.1c0-13.6,9.4-22.3,24.6-22.3
      c5.3,0,10.7,1.2,15.7,3.7v22.2c-4.1-4.3-10.3-6.9-15-6.9c-4.7,0-7.3,2-7.3,5.4C219.2,194.5,245.6,192.8,245.6,211z M143.1,235.5
      c-5.6,0-10.8-1.2-15.7-3.5v-22.2c5.9,5.1,11.2,6.5,14.6,6.5c4.4,0,6.9-1.7,6.9-4.4c0-2.8-2.5-4.5-6.7-6.4l-5.1-2.2
      c-7.1-3.2-12.6-9.7-12.6-19.1c0-12.7,9.8-22.3,25.1-22.3c5.1,0,10.1,1.3,15.1,3.5v21.8c-5-4.9-10.2-6.4-13.5-6.4
      c-3.8,0-6.4,1.6-6.4,4c0,2.3,2.1,3.8,6.1,5.5l7.6,3.3c8.8,3.9,11.7,10.6,11.7,18.6C170.4,225.5,160.9,235.5,143.1,235.5z"/>
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
  
  useEffect(() => {
    setIsFlipped(Boolean(cvv));
  }, [cvv]);
  
  // Detect card type from number
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
      // Mask all but last 5 digits
      const masked = cleanNumber.slice(0, -5).replace(/\d/g, '•');
      const visible = cleanNumber.slice(-5);
      
      // Format with proper spacing
      if (cleanNumber.length <= 4) {
        formattedNumber = cleanNumber;
      } else if (cleanNumber.length <= 10) {
        formattedNumber = cleanNumber.slice(0, 4) + ' ' + cleanNumber.slice(4);
      } else {
        formattedNumber = cleanNumber.slice(0, 4) + ' ' + cleanNumber.slice(4, 10) + ' ' + cleanNumber.slice(10);
      }
      
      // If not fully entered, pad with dots
      if (cleanNumber.length < 15) {
        formattedNumber = formattedNumber.padEnd(17, '•');
      }
    } else {
      // Other card types use 4-4-4-4 format
      // Mask all but last 4 digits
      const masked = cleanNumber.slice(0, -4).replace(/\d/g, '•');
      const visible = cleanNumber.slice(-4);
      
      // Format with proper spacing
      for (let i = 0; i < cleanNumber.length; i++) {
        if (i > 0 && i % 4 === 0) formattedNumber += ' ';
        formattedNumber += cleanNumber[i];
      }
      
      // If not fully entered, pad with dots
      if (cleanNumber.length < 16) {
        formattedNumber = formattedNumber.padEnd(19, '•');
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
      case 'discover': return 'purple';
      default: return 'cyan'; // More premium default color
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
    <div className={`${styles.container} ${preloadClass}`}>
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
              <text transform="matrix(1 0 0 1 54.1064 400.5723)" id="svgname" className={`${styles.st2} ${styles.st5} ${styles.st6}`}>{formatName()}</text>
              <text transform="matrix(1 0 0 1 54.1074 370.8793)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>שם בעל הכרטיס</text>
              <text transform="matrix(1 0 0 1 479.7754 370.8793)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>תוקף</text>
              <text transform="matrix(1 0 0 1 65.1054 241.5)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>מספר כרטיס</text>
              <g>
                <text transform="matrix(1 0 0 1 574.4219 400.1095)" id="svgexpire" className={`${styles.st2} ${styles.st5} ${styles.st9}`}>{formatExpiry()}</text>
                <text transform="matrix(1 0 0 1 479.3848 380.0097)" className={`${styles.st2} ${styles.st10} ${styles.st11}`}>VALID</text>
                <text transform="matrix(1 0 0 1 479.3848 395.6762)" className={`${styles.st2} ${styles.st10} ${styles.st11}`}>THRU</text>
                <polygon className={styles.st2} points="554.5,390 540.4,384.2 540.4,396.9" />
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
