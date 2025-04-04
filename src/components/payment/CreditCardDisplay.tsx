
import React, { useState, useEffect } from 'react';
import styles from '@/styles/CreditCardAnimation.module.css';
import { getCreditCardType } from './utils/paymentHelpers';

interface CreditCardDisplayProps {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
  onFlip?: (isFlipped: boolean) => void;
  className?: string;
}

const CreditCardDisplay: React.FC<CreditCardDisplayProps> = ({
  cardNumber,
  cardholderName,
  expiryDate,
  cvv,
  onFlip,
  className = ''
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardType, setCardType] = useState('');
  const [cardColor, setCardColor] = useState({ mainColor: 'lightblue', darkColor: 'lightbluedark' });

  useEffect(() => {
    // Determine card type based on number prefix
    const type = getCreditCardType(cardNumber.replace(/\s/g, ''));
    setCardType(type);
    
    // Set colors based on card type
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
        setCardColor({ mainColor: 'cyan', darkColor: 'cyandark' });
    }
  }, [cardNumber]);

  const handleCardFlip = () => {
    setIsFlipped(!isFlipped);
    if (onFlip) onFlip(!isFlipped);
  };

  // Format displayed card number with proper spacing and masking
  const formatCardNumber = (num: string) => {
    if (!num) return '•••• •••• •••• ••••';
    
    const isAmex = cardType === 'amex';
    const cardNumberLength = isAmex ? 15 : 16;
    const formatted = num.replace(/\s/g, '').padEnd(cardNumberLength, '•');
    
    // Hide middle digits for better security
    let masked = '';
    if (isAmex) {
      // Format: XXXX XXXXXX XXXXX (4-6-5)
      const start = formatted.slice(0, 4);
      const middle = '••••••';
      const end = formatted.slice(-5);
      masked = `${start} ${middle} ${end}`;
    } else {
      // Format: XXXX XXXX XXXX XXXX
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

  return (
    <div className={`${styles.container} ${className}`}>
      <div 
        className={`${styles.creditcard} ${isFlipped ? styles.flipped : ''} preload`}
        onClick={handleCardFlip}
        onAnimationEnd={() => document.querySelector('.preload')?.classList.remove('preload')}
      >
        {/* Front of card */}
        <div className={styles.front}>
          <svg version="1.1" id="cardfront" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
            x="0px" y="0px" viewBox="0 0 750 471" xmlSpace="preserve">
            <g id="Front">
              <g id="CardBackground">
                <g id="Page-1_1_">
                  <g id="amex_1_">
                    <path id="Rectangle-1_1_" className={`${styles.lightcolor} ${styles[cardColor.mainColor]}`} d="M40,0h670c22.1,0,40,17.9,40,40v391c0,22.1-17.9,40-40,40H40c-22.1,0-40-17.9-40-40V40
                  C0,17.9,17.9,0,40,0z" />
                  </g>
                </g>
                <path className={`${styles.darkcolor} ${styles[cardColor.darkColor]}`} d="M750,431V193.2c-217.6-57.5-556.4-13.5-750,24.9V431c0,22.1,17.9,40,40,40h670C732.1,471,750,453.1,750,431z" />
              </g>
              <text transform="matrix(1 0 0 1 60.106 295.0121)" id="svgnumber" className={`${styles.st2} ${styles.st3} ${styles.st4}`}>
                {formatCardNumber(cardNumber)}
              </text>
              <text transform="matrix(1 0 0 1 54.1064 428.1723)" id="svgname" className={`${styles.st2} ${styles.st5} ${styles.st6}`}>
                {cardholderName || 'FULL NAME'}
              </text>
              <text transform="matrix(1 0 0 1 54.1074 389.8793)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>cardholder name</text>
              <text transform="matrix(1 0 0 1 479.7754 388.8793)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>expiration</text>
              <text transform="matrix(1 0 0 1 65.1054 241.5)" className={`${styles.st7} ${styles.st5} ${styles.st8}`}>card number</text>
              <g>
                <text transform="matrix(1 0 0 1 574.4219 433.8095)" id="svgexpire" className={`${styles.st2} ${styles.st5} ${styles.st9}`}>
                  {expiryDate || 'MM/YY'}
                </text>
                <text transform="matrix(1 0 0 1 479.3848 417.0097)" className={`${styles.st2} ${styles.st10} ${styles.st11}`}>VALID</text>
                <text transform="matrix(1 0 0 1 479.3848 435.6762)" className={`${styles.st2} ${styles.st10} ${styles.st11}`}>THRU</text>
                <polygon className={styles.st2} points="554.5,421 540.4,414.2 540.4,427.9 		" />
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
              <g id="cardLogo">
                <div className={styles.cardLogo}>
                  {cardType === 'visa' && (
                    <svg className="visa" viewBox="0 0 100 55">
                      <path d="M40.75 14.63c-7.477.873-10.362 5.058-10.54 9.878H35.5c.77-1.04 1.966-2.165 4.5-2.494V14.63h.75z" fill="#016FD0"></path>
                      <path d="M35.5 24.508H30.21c-.77 2.37-2.117 4.498-3.93 6.285h11.152c1.15-1.376 2.029-3.38 2.568-6.285H35.5z" fill="#EEEEEE"></path>
                      <path d="M30.085 32.028a19.78 19.78 0 01-3.804 1.235H40c.462-.663.88-1.572 1.231-2.516.175-.532.34-1.105.5-1.954H26.28c1.068 1.218 2.305 2.328 3.805 3.235z" fill="#016FD0"></path>
                      <path d="M45.5 14.629v17.869a20.773 20.773 0 01-5 .01V14.63h5z" fill="#EEEEEE"></path>
                      <path d="M50.93 14.627c-1.152 0-2.27.145-3.43.444v17.45c1.142.252 2.346.377 3.593.306 5.343-.306 8.79-3.213 8.79-9.388 0-5.89-4.157-8.812-8.952-8.812z" fill="#016FD0"></path>
                      <path d="M68.724 14.63L61.5 32.483H56L52.353 17.31c1.913-1.027 4.287-2.262 7.147-2.68 1.397-.21 2.646-.105 3.224 0z" fill="#EEEEEE"></path>
                      <path d="M73 14.63h-4.367L63.5 32.498h4.673L73 14.629z" fill="#016FD0"></path>
                    </svg>
                  )}
                  {cardType === 'mastercard' && (
                    <svg viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M 40 0 L 20 0 C 8.954 0 0 8.954 0 20 C 0 31.046 8.954 40 20 40 L 40 40 C 51.046 40 60 31.046 60 20 C 60 8.954 51.046 0 40 0 Z" fill="#ED0006"/>
                      <path d="M 20 0 C 8.954 0 0 8.954 0 20 C 0 31.046 8.954 40 20 40 C 31.046 40 40 31.046 40 20 C 40 8.954 31.046 0 20 0 Z" fill="none" />
                      <path d="M 20 0 C 8.954 0 0 8.954 0 20 C 0 31.046 8.954 40 20 40 C 31.046 40 40 31.046 40 20 C 40 8.954 31.046 0 20 0 Z" fill="#F9A000"/>
                      <path d="M 20 0 C 20 8.954 20 31.046 20 40 C 31.046 40 40 31.046 40 20 C 40 8.954 31.046 0 20 0 Z" fill="#FF5E00"/>
                    </svg>
                  )}
                  {cardType === 'amex' && (
                    <svg viewBox="0 0 104 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M104 35.15V55.2C104 59.84 100.27 63.57 95.63 63.57H8.37C3.73 63.57 0 59.84 0 55.2V8.37C0 3.73 3.73 0 8.37 0H95.63C100.27 0 104 3.73 104 8.37V35.15Z" fill="#2FABF7"/>
                      <path d="M30.14 19.04V25.63L28.16 19.04H23.34V28.23C22.52 26.73 20.82 25.98 19.3 25.98C16.25 25.98 14 28.31 14 31.28C14 34.27 16.25 36.6 19.3 36.6C20.78 36.6 21.93 35.95 22.8 34.76V36.19H27.06V26.3L29.12 36.19H33.02L35.07 26.3V36.19H38.95V19.04H30.14Z" fill="white"/>
                      <path d="M19.3 34.19C17.32 34.19 16.5 32.7 16.5 31.28C16.5 29.87 17.32 28.38 19.3 28.38C21.28 28.38 22.1 29.87 22.1 31.28C22.1 32.7 21.28 34.19 19.3 34.19Z" fill="#228FE0"/>
                      <path d="M46.92 25.98C45.31 25.98 44.13 26.83 43.38 27.9V26.38H39.12V36.19H43.38V30.94C43.38 29.52 44.01 28.38 45.47 28.38C46.84 28.38 47.35 29.52 47.35 30.94V36.19H51.6V30.12C51.6 27.33 49.93 25.98 46.92 25.98Z" fill="white"/>
                      <path d="M59.82 25.98C58.13 25.98 57.14 26.5 56.28 27.41V19.04H52.02V36.19H56.28V34.76C57.07 35.95 58.17 36.6 59.82 36.6C62.88 36.6 65.12 34.27 65.12 31.28C65.12 28.31 62.88 25.98 59.82 25.98Z" fill="white"/>
                      <path d="M59.82 34.19C57.84 34.19 57.02 32.7 57.02 31.28C57.02 29.87 57.84 28.38 59.82 28.38C61.8 28.38 62.62 29.87 62.62 31.28C62.62 32.7 61.8 34.19 59.82 34.19Z" fill="#228FE0"/>
                      <path d="M75.13 25.98C73.52 25.98 72.33 26.83 71.59 27.9V26.38H67.33V36.19H71.59V30.94C71.59 29.52 72.21 28.38 73.67 28.38C75.05 28.38 75.56 29.52 75.56 30.94V36.19H79.81V30.12C79.81 27.33 78.14 25.98 75.13 25.98Z" fill="white"/>
                      <path d="M88.03 25.98C84.65 25.98 82.09 28.23 82.09 31.28C82.09 34.35 84.65 36.6 88.21 36.6C90.27 36.6 92.41 35.74 93.39 33.88L90.19 32.62C89.97 33.13 88.98 33.63 88.15 33.63C87.08 33.63 86.22 33.05 85.92 31.98H93.69V31.24C93.69 27.9 91.22 25.98 88.03 25.98Z" fill="white"/>
                      <path d="M88.01 28.69C88.93 28.69 89.67 29.2 89.91 30.04H85.92C86.2 29.2 86.95 28.69 88.01 28.69Z" fill="#228FE0"/>
                      <path d="M70.78 19.04H67.47L65.58 22.01L63.7 19.04H60.39L63.88 24.13L60.12 29.5H63.42L65.58 26.24L67.74 29.5H71.05L67.29 24.13L70.78 19.04Z" fill="white"/>
                    </svg>
                  )}
                  {cardType === 'discover' && (
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M92.07 100H7.93C3.55 100 0 96.45 0 92.07V7.93C0 3.55 3.55 0 7.93 0H92.07C96.45 0 100 3.55 100 7.93V92.07C100 96.45 96.45 100 92.07 100Z" fill="#FFFFFF"/>
                      <path d="M92.07 100H7.93C3.55 100 0 96.45 0 92.07V50H100V92.07C100 96.45 96.45 100 92.07 100Z" fill="#F58025"/>
                      <path d="M42.5 69.5C47.75 69.5 52 65.25 52 60C52 54.75 47.75 50.5 42.5 50.5C37.25 50.5 33 54.75 33 60C33 65.25 37.25 69.5 42.5 69.5Z" fill="#F58025"/>
                      <path d="M91 69.5H83.75V68H91V69.5ZM76.25 69.5H73.5V56.25H76.25V69.5ZM70.75 64.25C70.75 67.5 68.25 70 65 70C61.75 70 59.25 67.5 59.25 64.25C59.25 61 61.75 58.5 65 58.5C68.25 58.5 70.75 61.25 70.75 64.25Z" fill="white"/>
                      <path d="M65 60C62.75 60 60.75 61.75 60.75 64.25C60.75 66.75 62.5 68.5 65 68.5C67.5 68.5 69.25 66.75 69.25 64.25C69.25 61.75 67.5 60 65 60Z" fill="white"/>
                      <path d="M57.75 69.5H55.25L54 63C53.75 61.75 53.5 60.5 53.5 60.5C53.5 60.5 53.25 61.75 53 63L51.75 69.5H49.25L47.25 56.25H49.75L50.75 62.75C51 64 51 65.25 51 65.25C51 65.25 51.25 64 51.5 62.75L52.75 56.25H55.25L56.5 62.75C56.75 64 57 65.25 57 65.25C57 65.25 57.25 64 57.25 62.75L58.5 56.25H60.75L57.75 69.5Z" fill="white"/>
                      <path d="M91 65H87C87.25 66.5 88.5 67.5 90.25 67.5C91.5 67.5 92.5 67 93.5 66.25L92.5 68C91.75 68.75 90.5 69.25 89 69.25C86 69.25 84.25 67 84.25 63.75C84.25 60.5 86.25 58 89 58C92 58 93.5 60.25 93.5 63.25L91 65Z" fill="white"/>
                      <path d="M89 60C87.75 60 87 60.75 87 62.5H90.75C90.75 61 90 60 89 60Z" fill="white"/>
                      <path d="M22.25 69.5L18.75 64L18.5 64.25V69.5H16V56.25H18.5V62.25C19.5 61.25 21.75 58.75 21.75 58.75L25 56.25H28L23.25 61L28.25 69.5H25L22.25 69.5Z" fill="white"/>
                      <path d="M9 69.5V56.25H16C18.25 56.25 19.75 57.5 19.75 59.25C19.75 60.75 18.75 61.75 17.5 62C19 62.25 20.25 63.5 20.25 65C20.25 67.5 18.5 69.5 15.75 69.5H9Z" fill="white"/>
                      <path d="M11.5 58.25V61.5H15.25C16.25 61.5 17 61 17 59.75C17 58.5 16.25 58.25 15.25 58.25H11.5Z" fill="white"/>
                      <path d="M15.75 63.5H11.5V67.5H15.75C16.75 67.5 17.75 66.75 17.75 65.5C17.75 64.25 16.75 63.5 15.75 63.5Z" fill="white"/>
                      <path d="M33 36.5H66V37.75H33V36.5Z" fill="#100F0D"/>
                    </svg>
                  )}
                  {cardType === 'diners' && (
                    <svg viewBox="0 0 30 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M28.5879 0H1.41211C0.632324 0 0 0.632324 0 1.41211V18.5879C0 19.3677 0.632324 20 1.41211 20H28.5879C29.3677 20 30 19.3677 30 18.5879V1.41211C30 0.632324 29.3677 0 28.5879 0Z" fill="#0079BE"/>
                      <path d="M14 3.5C9.3 3.5 5.5 7.3 5.5 12C5.5 16.7 9.3 20.5 14 20.5C18.7 20.5 22.5 16.7 22.5 12C22.5 7.3 18.7 3.5 14 3.5ZM9.2 12C9.2 9.4 11.3 7.3 14 7.3C16.7 7.3 18.8 9.4 18.8 12C18.8 14.6 16.7 16.7 14 16.7C11.3 16.7 9.2 14.6 9.2 12Z" fill="white"/>
                      <path d="M15 7.5V16.5H13V7.5H15Z" fill="#0079BE"/>
                    </svg>
                  )}
                </div>
              </g>
            </g>
          </svg>
        </div>
        
        {/* Back of card */}
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
