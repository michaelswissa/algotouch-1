
import React, { useState, useEffect, useRef } from 'react';
import styles from '@/styles/CreditCardAnimation.module.css';
import { getCreditCardType } from './utils/paymentHelpers';

interface CreditCardDisplayProps {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
  onFlip?: (isFlipped: boolean) => void;
  isFlipped?: boolean;
  className?: string;
  premium?: boolean;
}

const CreditCardDisplay: React.FC<CreditCardDisplayProps> = ({
  cardNumber,
  cardholderName,
  expiryDate,
  cvv,
  onFlip,
  isFlipped: externalIsFlipped,
  className = '',
  premium = false
}) => {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false);
  const [cardType, setCardType] = useState('');
  const [cardColor, setCardColor] = useState({ mainColor: 'lightblue', darkColor: 'lightbluedark' });
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isFlipped = externalIsFlipped !== undefined ? externalIsFlipped : internalIsFlipped;

  useEffect(() => {
    const type = getCreditCardType(cardNumber.replace(/\s/g, ''));
    setCardType(type);
    
    if (premium) {
      setCardColor({ mainColor: 'gradient-gold', darkColor: 'gradient-gold-dark' });
    } else {
      switch (type) {
        case 'visa':
          setCardColor({ mainColor: 'blue', darkColor: 'lightbluedark' });
          break;
        case 'mastercard':
          setCardColor({ mainColor: 'red', darkColor: 'reddark' });
          break;
        case 'amex':
          setCardColor({ mainColor: 'green', darkColor: 'greendark' });
          break;
        case 'discover':
          setCardColor({ mainColor: 'orange', darkColor: 'orangedark' });
          break;
        case 'diners':
          setCardColor({ mainColor: 'purple', darkColor: 'purpledark' });
          break;
        default:
          setCardColor({ mainColor: 'gradient-blue', darkColor: 'cyan' });
      }
    }
  }, [cardNumber, premium]);

  const handleCardFlip = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    if (externalIsFlipped !== undefined && onFlip) {
      onFlip(!externalIsFlipped);
    } else {
      setInternalIsFlipped(!internalIsFlipped);
    }
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 800);
  };

  const formatCardNumber = (num: string) => {
    if (!num) return '•••• •••• •••• ••••';
    
    const isAmex = cardType === 'amex';
    const cardNumberLength = isAmex ? 15 : 16;
    const formatted = num.replace(/\s/g, '').padEnd(cardNumberLength, '•');
    
    let masked = '';
    if (isAmex) {
      const start = formatted.slice(0, 4);
      const middle = '••••••';
      const end = formatted.slice(-5);
      masked = `${start} ${middle} ${end}`;
    } else {
      const groups = [];
      for (let i = 0; i < 16; i += 4) {
        let group = formatted.slice(i, i + 4);
        if (i > 0 && i < 12) {
          group = '••••';
        }
        groups.push(group);
      }
      masked = groups.join(' ');
    }
    
    return masked;
  };

  const getCardClass = () => {
    let cardClass = styles.creditcard;
    if (isFlipped) cardClass += ` ${styles.flipped}`;
    if (premium) cardClass += ` ${styles['premium-card']}`;
    return cardClass;
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div 
        className={getCardClass()}
        onClick={handleCardFlip}
        ref={cardRef}
      >
        <div className={styles.front}>
          <svg version="1.1" id="cardfront" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
            x="0px" y="0px" viewBox="0 0 750 471" xmlSpace="preserve">
            <defs>
              <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#03A9F4" />
                <stop offset="100%" stopColor="#0288D1" />
              </linearGradient>
              <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ab47bc" />
                <stop offset="100%" stopColor="#7b1fa2" />
              </linearGradient>
              <linearGradient id="gradient-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bf953f" />
                <stop offset="50%" stopColor="#fcf6ba" />
                <stop offset="100%" stopColor="#b38728" />
              </linearGradient>
              <linearGradient id="gradient-gold-dark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b38728" />
                <stop offset="100%" stopColor="#8e6b0d" />
              </linearGradient>
              <filter id="card-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="15" />
                <feOffset dx="0" dy="10" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.6" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="emboss" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                <feOffset in="blur" dx="1" dy="1" result="offsetBlur" />
                <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1" specularExponent="20" lighting-color="#FFFFFF" result="specOut">
                  <fePointLight x="-5000" y="-10000" z="20000" />
                </feSpecularLighting>
                <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut2" />
                <feComposite in="SourceGraphic" in2="specOut2" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
              </filter>
            </defs>
            
            <g id="Front">
              <g id="CardBackground" filter="url(#card-shadow)">
                <g id="Page-1_1_">
                  <g id="amex_1_">
                    <path id="Rectangle-1_1_" className={`${styles.lightcolor} ${styles[cardColor.mainColor]}`} d="M40,0h670c22.1,0,40,17.9,40,40v391c0,22.1-17.9,40-40,40H40c-22.1,0-40-17.9-40-40V40
                  C0,17.9,17.9,0,40,0z" />
                  </g>
                </g>
                <path className={`${styles.darkcolor} ${styles[cardColor.darkColor]}`} d="M750,431V193.2c-217.6-57.5-556.4-13.5-750,24.9V431c0,22.1,17.9,40,40,40h670C732.1,471,750,453.1,750,431z" />
              </g>
              <text transform="matrix(1 0 0 1 60.106 295.0121)" id="svgnumber" className={`${styles.st2} ${styles.st3} ${styles.st4} ${styles['embossed-text']}`} filter="url(#emboss)">
                {formatCardNumber(cardNumber)}
              </text>
              <text transform="matrix(1 0 0 1 54.1064 428.1723)" id="svgname" className={`${styles.st2} ${styles.st5} ${styles.st6} ${styles['embossed-name']}`}>
                {cardholderName || 'FULL NAME'}
              </text>
              <text transform="matrix(1 0 0 1 54.1074 389.8793)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>cardholder name</text>
              <text transform="matrix(1 0 0 1 479.7754 388.8793)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>expiration</text>
              <text transform="matrix(1 0 0 1 65.1054 241.5)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>card number</text>
              <g>
                <text transform="matrix(1 0 0 1 574.4219 433.8095)" id="svgexpire" className={`${styles.st2} ${styles.st5} ${styles.st9} ${styles['embossed-text']}`}>
                  {expiryDate || 'MM/YY'}
                </text>
                <text transform="matrix(1 0 0 1 479.3848 417.0097)" className={`${styles.st2} ${styles.st10} ${styles.st11}`}>VALID</text>
                <text transform="matrix(1 0 0 1 479.3848 435.6762)" className={`${styles.st2} ${styles.st10} ${styles.st11}`}>THRU</text>
                <polygon className={styles.st2} points="554.5,421 540.4,414.2 540.4,427.9 		" />
              </g>
              <g id="cchip" className={styles.ccchip}>
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
              
              {/* Card Brand Logo */}
              <g id="cardLogo" className={styles.cardLogo}>
                {cardType === 'visa' && (
                  <svg className={styles.logoSvg} viewBox="0 0 750 471">
                    <path d="M278.1,334.2c-9.6,4.7-25,8.3-44,8.3c-48.2,0-82-24.2-82-70.9c0-42.5,32.1-74.5,83.8-74.5c16.7,0,31.1,3.4,38.9,7.2
                      l-6.5,22.2c-6.8-3.4-17.4-6.5-31.8-6.5c-32.9,0-54.5,20.9-54.5,50.9c0,30.5,20.7,50.2,53.6,50.2c12.8,0,25.8-2.6,33.9-6.8
                      L278.1,334.2z" fill="#ffffff"/>
                    <path d="M293.8,195.6h30.5l-18.7,109.8h-30.4L293.8,195.6z" fill="#ffffff"/>
                    <path d="M405.1,305.3l3.9-22.2l-9,0.1l-48.1,0l26.1-88h31.2l-21.9,71.2l28.3-0.1l9.5-27.1h29.7l-9.5,27.1
                      l15.7-0.1l-4.4,22.1H405.1z" fill="#ffffff"/>
                    <path d="M457.5,304.9l26.5-109.2h31.6l-26.6,109.2H457.5z" fill="#ffffff"/>
                  </svg>
                )}
                {cardType === 'mastercard' && (
                  <svg className={styles.logoSvg} viewBox="0 0 750 471">
                    <path d="M364.4,358c-73.9,0-133.8-59.9-133.8-133.8c0-73.9,59.9-133.8,133.8-133.8
                      c24.1,0,46.8,6.4,66.3,17.5c-29.2-22.8-65.9-36.4-105.8-36.4c-94.7,0-171.5,76.8-171.5,171.5
                      s76.8,171.5,171.5,171.5c48.3,0,92-20,123.4-52.3C428.2,346.4,397.6,358,364.4,358z" fill="#D9222A"/>
                    <path d="M533,207.2c0,94.7-76.8,171.5-171.5,171.5c-48.3,0-92-20-123.4-52.3
                      c32.2,25.1,72.5,40,116.4,40c103.6,0,187.6-84,187.6-187.6c0-49.4-19.1-94.3-50.3-127.8
                      C518.7,81.6,533,120.8,533,207.2z" fill="#EE9F2D"/>
                    <path d="M490.7,142.5c1.6,4.2,2.4,8.8,2.4,13.6c0,10.1-4,19.5-11.8,26c-7.7,6.5-18.4,9.7-31.8,9.7
                      c-12.8,0-23.6-2.7-32.4-8v-24.1c9.4,7.9,19.9,11.9,31.6,11.9c4.7,0,8.5-1,11.3-2.9c2.8-1.9,4.2-4.6,4.2-8
                      c0-3.3-1.3-6.2-4-8.6c-2.7-2.4-8-5.2-15.9-8.5c-8-3.3-14-6.3-18-9c-4-2.7-7.1-5.9-9.2-9.5
                      c-2.2-3.6-3.2-7.9-3.2-12.9c0-9.5,3.8-17.4,11.5-23.9c7.7-6.4,17.7-9.6,30.1-9.6c8.9,0,17,1.6,24.4,4.7
                      c2.6,1.1,3.9,2.7,3.9,4.9c0,0.9-0.3,1.9-0.9,3.1l-6.6,14.6c-6.2-3.8-13.2-5.7-21-5.7c-4.2,0-7.6,0.8-10.1,2.5
                      c-2.5,1.6-3.8,3.8-3.8,6.4c0,2.7,1.3,5.1,3.9,7c2.6,1.9,8,4.5,16.2,7.9C478,129.1,486.9,135.3,490.7,142.5z" fill="#FFFFFF"/>
                    <path d="M217.1,169.5c0,8.6,3.9,12.9,11.6,12.9c4.7,0,9-1.3,13-4c4-2.6,6.5-5.2,7.5-7.9v-16.9h-16.3
                      c-5.2,0-9.3,1.4-12.1,4.2C218.6,160.7,217.1,164.5,217.1,169.5z M189.9,169.7c0-12,4.1-21.8,12.4-29.6
                      c8.3-7.7,19.8-11.6,34.6-11.6h31.1v14.9c0,2.8-0.5,4.8-1.5,5.9c-1,1.1-2.5,2-4.5,2.7c5.1,2.1,9,5.3,11.6,9.6
                      c2.6,4.3,3.9,9,3.9,14.1c0,11.5-4,21.1-12,28.7c-8,7.6-18,11.4-30.1,11.4c-13.8,0-24.8-3.9-33.1-11.8
                      C194,195.9,189.9,184.2,189.9,169.7z" fill="#FFFFFF"/>
                    <path d="M301.5,215.2h-23.4v-24.1c7.6,2.1,15,3.1,22.3,3.1c18.6,0,32.8-4.3,42.4-12.9
                      c9.7-8.6,14.5-20.5,14.5-35.8c0-13.9-4.3-24.8-12.9-32.8c-8.6-8-20.2-12-34.7-12c-8.4,0-15.3,1.3-21,4
                      c-2.6,1.2-4.4,1.8-5.3,1.8c-2.7,0-4-2.1-4-6.2V85.6h26.2v23.8c5-4.7,13.1-7,24.1-7c8.6,0,15.3,2.7,20,8
                      c4.7,5.3,7.1,12.5,7.1,21.6c0,9-2.7,16.2-8,21.6c-5.3,5.4-12.7,8-22.2,8c-6.7,0-12.6-1.2-17.8-3.5L301.5,215.2z" fill="#FFFFFF"/>
                  </svg>
                )}
                {cardType === 'amex' && (
                  <svg className={styles.logoSvg} viewBox="0 0 750 471">
                    <path d="M47.5,236.8v-32.9h37.6l4.2,4.9l4.4-4.9h131.9v7l2.7-7h31.4v7l2.6-7h32v7.6
                       l5.3-7.6h67.1v32.9h-67.9l-4.7-7.1v7.1h-39.5l-2.6-6.7h-7.1l-2.5,6.7h-62.7c-3.4,0-8-0.8-11.4-3.4l-0.5-0.4l-0.5,0.4
                       c-3.4,2.6-8,3.4-11.4,3.4H47.5z M384.8,236.8l-11.9-11.9l-11.8,11.9h-70.3v-32.9h71.6l11.3,11.5l11.4-11.5h33.3
                       c15.4,0,24.8,6.5,24.8,16.5c0,10.1-9.4,16.5-24.8,16.5H384.8z" fill="#006FCF"/>
                    <polygon points="41.5,266.9 54.8,266.9 63.8,284.7 63.8,266.9 79.6,266.9 84.7,278.3 89.8,266.9 
                      105.5,266.9 105.5,299.9 92.2,299.9 92.2,276 85.3,299.9 83.1,299.9 76.1,276 76.1,299.9 59.2,299.9 49.5,281.5 49.5,299.9 
                      41.5,299.9" fill="#006FCF"/>
                    <path d="M222.7,287.3c0,2-0.3,3.3-0.9,4.1c-0.6,0.8-1.5,1.2-2.7,1.2c-1.2,0-2.1-0.4-2.7-1.2
                      c-0.6-0.8-0.9-2.1-0.9-4.1c0-2,0.3-3.3,0.9-4.1c0.6-0.8,1.5-1.2,2.7-1.2c1.2,0,2.1,0.4,2.7,1.2
                      C222.3,284,222.7,285.3,222.7,287.3z M231.6,266.9v32.9h-12.7v-3.1h-0.2c-1.8,2.5-4.5,3.9-8.2,3.9c-3.1,0-5.5-1.2-7.3-3.5
                      c-1.8-2.3-2.7-5.5-2.7-9.7c0-4.4,0.9-7.7,2.7-10c1.8-2.3,4.3-3.4,7.5-3.4c3.3,0,5.8,1.3,7.5,3.8h0.2v-11H231.6z" fill="#006FCF"/>
                    <path d="M249.3,299.9h-13.3v-24.8h13.3V299.9z M249.5,273.5h-13.7v-6.6h13.7V273.5z" fill="#006FCF"/>
                    <path d="M280.4,287.7c0,8.5-4.1,12.7-12.4,12.7c-8.1,0-12.1-4.4-12.1-13.2v-12.2h13.3v14
                      c0,2.7,1,4,3,4c1.9,0,2.9-1.3,2.9-4v-14h13.3v12.7H280.4z" fill="#006FCF"/>
                    <path d="M321.7,299.9h-18.3v-24.8h13.3v5.8c0,0.9,0,1.8-0.1,2.9c-0.1,1.1-0.3,2-0.6,2.7h0.2
                      c1.4-1.1,2.7-2,3.9-2.5c1.2-0.5,2.5-0.8,3.7-0.8c0.4,0,0.7,0,1,0c0.3,0,0.6,0,0.8,0L321.7,299.9z" fill="#006FCF"/>
                    <path d="M339.3,299.9h-15.2v-3.7h3.3v-17.4h-3.3v-3.7h15.2v3.7h-3.2v17.4h3.2V299.9z" fill="#006FCF"/>
                    <path d="M371.5,290.1c0.4,0,0.9,0.1,1.3,0.2c0.4,0.1,0.7,0.3,1,0.5c0.3,0.2,0.5,0.6,0.6,1
                      c0.1,0.4,0.2,0.9,0.2,1.5v6.7h-9.4c-3.6,0-6.4-0.8-8.2-2.5c-1.9-1.7-2.8-4.1-2.8-7.4c0-3.2,0.9-5.7,2.8-7.4c1.9-1.7,4.6-2.5,8.2-2.5
                      h10v6.7H364c-1,0-1.8,0.2-2.3,0.5c-0.5,0.3-0.8,0.8-0.8,1.5c0,0.5,0.1,0.9,0.4,1.2s0.7,0.4,1.2,0.4c0.3,0,0.6,0,0.8-0.1
                      c0.1-0.1,0.3-0.2,0.5-0.3v-0.9L371.5,290.1z M374.6,280.9c0,0.5-0.1,0.9-0.3,1.3s-0.5,0.6-0.8,0.8c-0.3,0.2-0.7,0.3-1.2,0.4
                      c-0.4,0.1-0.9,0.1-1.4,0.1h-9.2v-5.9h9.2c0.5,0,1,0,1.4,0.1c0.4,0.1,0.8,0.2,1.2,0.4c0.3,0.2,0.6,0.5,0.8,0.8
                      C374.5,279.9,374.6,280.4,374.6,280.9z" fill="#006FCF"/>
                    <path d="M387.8,299.9h-13.3v-32.9h13.3V299.9z" fill="#006FCF"/>
                    <polygon points="406.5,299.9 393.2,299.9 393.2,266.9 406.5,266.9 406.5,280.6 418.3,280.6 
                      418.3,266.9 431.5,266.9 431.5,299.9 418.3,299.9 418.3,286.7 406.5,286.7" fill="#006FCF"/>
                    <path d="M306.1,221.8h32.1v-15.8h-45v31.9h12c1.3,0,2.5-0.3,3.5-0.9c1-0.6,1.9-1.4,2.6-2.4l9.4-12.8
                      H306.1z" fill="#006FCF"/>
                    <polygon points="193.8,205.9 139.5,205.9 139.5,214.3 162,214.3 162,221.8 186.6,221.8 
                      193.8,213.1" fill="#006FCF"/>
                    <polygon points="193.8,221.8 162,221.8 162,228.9 186.6,228.9 193.8,221.8" fill="#006FCF"/>
                    <polygon points="115.6,205.9 85.4,205.9 69,221.8 85.4,236.8 115.6,236.8 99.2,221.8" fill="#006FCF"/>
                    <path d="M359.4,214.3h45c0-1.3-0.3-2.5-0.9-3.5c-0.6-1-1.4-1.9-2.4-2.6l-4.3-2.4h-32.8v24.8h12.9v-16.4
                      H359.4z" fill="#006FCF"/>
                  </svg>
                )}
                {cardType === 'discover' && (
                  <svg className={styles.logoSvg} viewBox="0 0 780 500">
                    <path fill="#fff" d="M409.4,197.5c31.2,0,56.5-25.4,56.5-56.6c0-31.2-25.4-56.5-56.5-56.5c-31.2,0-56.5,25.4-56.5,56.5
                      C352.9,172.2,378.2,197.5,409.4,197.5z"/>
                    <path fill="#F47216" d="M321.2,120.4c-4.5-1.2-9.4-1.9-14.1-1.9c-30,0-51.9,20.2-51.9,49.1c0,29.1,22.9,49.2,53.7,49.2
                      c7.5,0,15.6-1.5,20.9-4.1v-32.6c-6,6-11.2,7.5-18,7.5c-15.3,0-25.7-11.2-25.7-27.7c-0.7-15.8,10.5-27.7,24.2-27.7
                      c7.5,0,12.7,1.5,17.9,4.5v-16.3H321.2z"/>
                    <rect x="224.7" y="119.3" fill="#F47216" width="31.2" height="95.7"/>
                    <path fill="#F47216" d="M179.4,142c-10.5-3.7-13.5-6-13.5-10.5c0-5.2,5.2-9,12-9c4.9,0,8.9,2,13.4,6.9l16.5-15.7
                      c-9-10.5-19.9-15-32.6-15c-19.5,0-34.5,13.5-34.5,31.9c0,15.3,7.1,23.2,27.7,30.7c8.6,3,12,5.2,12,10.5
                      c0,6.3-5.2,10.5-13.5,10.5c-9,0-15-3.8-19.9-12l-19.1,12.7c8.2,15.3,22.4,22.1,40.8,22.1c23.6,0,38.5-12.7,38.5-33
                      C206.7,156.3,199.6,149.3,179.4,142z"/>
                    <path fill="#F47216" d="M439.9,119.3h-30.4l-34.1,95.7h29.6l5.2-15h29.2l5.2,15h30.4L439.9,119.3z M416.3,174.2
                      l8.6-25.7l8.6,25.7H416.3z"/>
                    <polygon fill="#F47216" points="538.1,166.7 563.1,119.3 530.4,119.3 516.2,148.5 501.9,119.3 464.9,119.3 
                      464.9,215 496.1,215 496.1,154.4 514.8,192 518.1,192 536.6,153.6 536.6,215 567.9,215 567.9,166.7"/>
                    <path fill="#F47216" d="M406.5,264.1c0,0-8.6-1.5-12.7-1.5c-22.2,0-33,12-33,28.9c0,12,7.5,18.7,20.2,22.9
                      c9,3,10.5,3.7,10.5,6.7c0,3.7-4.5,5.2-9,5.2c-7.5,0-14.2-3-18-4.5l-3.7,16.5c4.5,2.2,12.7,4.5,21.7,4.5c22.1,0,33.7-10.5,33.7-29.1
                      c0-12-6.7-19.1-19.9-23.1c-9-3-11.2-3.7-11.2-6.7c0-3,3-4.4,8.2-4.4c6,0,12.7,1.9,15.7,3l3.7-17.6L406.5,264.1z"/>
                    <polygon fill="#F47216" points="436.2,264.9 436.2,342.6 467.4,342.6 467.4,306.6 489.3,306.6 489.3,287.1 
                      467.4,287.1 467.4,284.8 467.4,281.1 495.1,281.1 495.1,264.9"/>
                    <path fill="#F47216" d="M547.7,264.1c-22.9,0-38.2,16.5-38.2,40.1c0,24.4,15.3,40.1,38.2,40.1s38.9-16.5,38.9-40.1
                      C585.9,280.7,570.6,264.1,547.7,264.1z M547.7,328.4c-13.5,0-21.7-11.2-21.7-24.2c0-13.5,8.2-24.2,21.7-24.2
                      c13.5,0,21.7,11.2,21.7,24.2C569.4,317.9,561.2,328.4,547.7,328.4z"/>
                    <path fill="#F47216" d="M642.2,304.4c0,11.2-5.2,17.2-15,17.2c-9.7,0-15-6-15-17.2v-39.4h-16.5v39.4
                      c0,22.9,12.7,34.9,31.4,34.9c19.5,0,31.9-12.7,31.9-34.9v-39.4h-16.5v39.4H642.2z"/>
                    <rect x="673.4" y="264.9" fill="#F47216" width="16.5" height="77.7"/>
                    <path fill="#F47216" d="M750,328.4c-9,0-12.7-6.7-12.7-16.5v-47.1h-16.4v47.1c0,19.5,10.5,32.6,28.9,32.6
                      c5.2,0,7.4-0.7,11.1-1.5v-15C758.5,327.9,755.1,328.4,750,328.4z"/>
                    <path fill="#F47216" d="M135.3,297v41.6h16.4v-35.6c0-17.2-11.3-38.9-37-38.9c-13.5,0-22.9,4.4-32.6,14.9
                      c-7.5-10.5-18.7-14.9-31.9-14.9c-12.7,0-20.9,3.7-29.2,11.9V266H5.2v72.6h16.5v-40.1c0-16.5,9-23.9,22.1-23.9
                      c13.5,0,20.2,9,20.2,24.6v39.4h16.5v-40.1c0-16.5,9-23.9,22.1-23.9C116.3,274.6,123.8,283.6,135.3,297z"/>
                    <path fill="#F47216" d="M766.5,266h-18v15h18v61.6h16.4V281.1H798V266h-15.3v-3.7c0-6,3.7-9.7,12-9.7
                      c1.5,0,6,0,9,0.7v-13.5c-4.5-1.5-9.7-2.2-14.2-2.2c-18.7,0-23.1,11.9-23.1,23.9V266L766.5,266z"/>
                    <path fill="#F47216" d="M44.8,381c0,7.4,5.2,13.5,13.1,13.5c8.2,0,13.5-6,13.5-13.5c0-7.5-5.2-13.5-13.5-13.5
                      C50,367.5,44.8,373.5,44.8,381z"/>
                  </svg>
                )}
                {cardType === 'diners' && (
                  <svg className={styles.logoSvg} viewBox="0 0 780 500">
                    <path fill="#0079BE" d="M600,350H180V150h420V350z"/>
                    <path fill="#FFFFFF" d="M348.8,350.1v-0.5c82.2-33.8,137.9-113,137.9-206c0-93-55.7-172.2-137.9-206v-0.1h-18
                      c-92.7,0-168.4,92.8-168.4,206.1c0,113.3,75.6,206,168.4,206.1H348.8L348.8,350.1z"/>
                    <path fill="#0079BE" d="M314.2,143.6c-84.1,1-126.2,44-126.2,100.3c0,56.3,42.1,100.3,126.2,101.3
                      c84.1-1,126.2-45,126.2-101.3C440.4,187.6,398.3,144.6,314.2,143.6z"/>
                    <path fill="#FFFFFF" d="M314.2,143.6v32.1c22.7,0.1,42.9,9.2,57.3,23.9c14.4,14.7,23.5,35,23.5,44.2c0,9.2-9,29.6-23.5,44.2
                      c-14.4,14.7-34.6,23.9-57.3,24v32.1c47.8-1,85.7-27.4,85.7-100.3C399.9,171,362,144.6,314.2,143.6z"/>
                    <path fill="#FFFFFF" d="M309.2,339.6v-32.1c-22.7-0.1-42.9-9.2-57.3-23.9c-14.4-14.7-23.5-35-23.5-44.2
                      c0-9.2,9-29.6,23.5-44.2c14.4-14.7,34.6-23.9,57.3-24v-32.1c-47.8,1-85.7,27.4-85.7,100.3C223.6,312.2,261.5,338.5,309.2,339.6z"
                      />
                  </svg>
                )}
              </g>
            </g>
          </svg>
        </div>
        
        <div className={styles.back}>
          <svg version="1.1" id="cardback" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
            x="0px" y="0px" viewBox="0 0 750 471" xmlSpace="preserve">
            <g id="Back">
              <g id="Page-1_2_">
                <g id="amex_2_">
                  <path id="Rectangle-1_2_" className={styles.st0} d="M40,0h670c22.1,0,40,17.9,40,40v391c0,22.1-17.9,40-40,40H40c-22.1,0-40-17.9-40-40V40
                C0,17.9,17.9,0,40,0z"/>
                </g>
              </g>
              <rect y="61.6" className={styles.st3back} width="750" height="78"/>
              <g>
                <path className={styles.st4back} d="M701.1,249.1H48.9c-3.3,0-6-2.7-6-6v-52.5c0-3.3,2.7-6,6-6h652.1c3.3,0,6,2.7,6,6v52.5
                      C707.1,246.4,704.4,249.1,701.1,249.1z"/>
                <rect x="42.9" y="198.6" className={styles.st5back} width="664.1" height="10.5"/>
                <rect x="42.9" y="224.5" className={styles.st5back} width="664.1" height="10.5"/>
                <path className={styles.st5back} d="M701.1,184.6H618h-8h-10v64.5h10h8h83.1c3.3,0,6-2.7,6-6v-52.5C707.1,187.3,704.4,184.6,701.1,184.6z"/>
              </g>
              <text transform="matrix(1 0 0 1 621.999 227.2734)" id="svgsecurity" className={`${styles.st6back} ${styles.st7back}`}>
                {cvv || '•••'}
              </text>
              <g className={styles.st8back}>
                <text transform="matrix(1 0 0 1 518.1064 280.0879)" className={`${styles.st9back} ${styles.st6back} ${styles.st10back}`}>security code</text>
              </g>
              <rect x="58.1" y="378.6" className={styles.st11back} width="375.5" height="13.5"/>
              <rect x="58.1" y="405.6" className={styles.st11back} width="421.7" height="13.5"/>
              <text transform="matrix(1 0 0 1 59.5073 228.6099)" id="svgnameback" className={`${styles.st12back} ${styles.st13back}`}>
                {cardholderName || 'John Doe'}
              </text>
              <g>
                <path className={styles.st4back} d="M680.0597,342.5387h-28.3887c-2.8,0-5.0869-2.2869-5.0869-5.0869v-16.6301
                      c0-2.8,2.2869-5.0869,5.0869-5.0869H680.0597c2.8,0,5.0869,2.2869,5.0869,5.0869v16.6301
                      C685.1466,340.2518,682.8597,342.5387,680.0597,342.5387z"/>
                <text transform="matrix(1 0 0 1 655.2817 334.4102)" id="svgcvv" className={`${styles.st9back} ${styles.st6back} ${styles.st10back}`}>{cvv || '•••'}</text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default CreditCardDisplay;
