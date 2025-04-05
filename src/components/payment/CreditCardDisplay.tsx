
import React, { useState, useEffect } from 'react';
import styles from '@/styles/CreditCardDisplay.module.css';
import { getCreditCardType } from './utils/paymentHelpers';
import VisaLogo from './logos/VisaLogo';
import MastercardLogo from './logos/MastercardLogo';
import AmexLogo from './logos/AmexLogo';
import DiscoverLogo from './logos/DiscoverLogo';
import GenericCardLogo from './logos/GenericCardLogo';

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

  const isFlipped = externalIsFlipped !== undefined ? externalIsFlipped : internalIsFlipped;

  useEffect(() => {
    const type = getCreditCardType(cardNumber.replace(/\s/g, ''));
    setCardType(type);
  }, [cardNumber]);

  const handleCardFlip = () => {
    if (externalIsFlipped !== undefined && onFlip) {
      onFlip(!externalIsFlipped);
    } else {
      setInternalIsFlipped(!internalIsFlipped);
    }
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
    if (premium) cardClass += ` ${styles.premium}`;
    
    // Add card type specific class
    switch (cardType) {
      case 'visa':
        cardClass += ` ${styles.visa}`;
        break;
      case 'mastercard':
        cardClass += ` ${styles.mastercard}`;
        break;
      case 'amex':
        cardClass += ` ${styles.amex}`;
        break;
      case 'discover':
        cardClass += ` ${styles.discover}`;
        break;
      default:
        cardClass += ` ${styles.default}`;
    }
    
    return cardClass;
  };

  const renderCardLogo = () => {
    switch (cardType) {
      case 'visa':
        return <VisaLogo className={styles.cardLogo} />;
      case 'mastercard':
        return <MastercardLogo className={styles.cardLogo} />;
      case 'amex':
        return <AmexLogo className={styles.cardLogo} />;
      case 'discover':
        return <DiscoverLogo className={styles.cardLogo} />;
      default:
        return <GenericCardLogo className={styles.cardLogo} />;
    }
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={getCardClass()} onClick={handleCardFlip}>
        <div className={styles.front}>
          <div className={styles.cardLogoContainer}>
            {renderCardLogo()}
          </div>
          
          <div className={styles.chip}></div>
          
          <div className={styles.cardNumber}>
            {formatCardNumber(cardNumber)}
          </div>
          
          <div className={styles.cardholderDetails}>
            <div className={styles.expiryDate}>
              <div className={styles.expiryLabel}>MM/YY</div>
              <div className={styles.expiryValue}>{expiryDate || 'MM/YY'}</div>
            </div>
            
            <div className={styles.cardholderName}>
              <div className={styles.cardholderValue}>{cardholderName || 'YOUR NAME'}</div>
            </div>
          </div>
        </div>
        
        <div className={styles.back}>
          <div className={styles.magneticStrip}></div>
          <div className={styles.signatureStrip}>
            <div className={styles.cvv}>{cvv || '123'}</div>
          </div>
          <div className={styles.cardBackText}>
            This card is property of the issuer. Use of this card is subject to the agreement with the issuer.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCardDisplay;
