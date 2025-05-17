
/**
 * Utility functions for trading calculations used by the chatbot
 */

/**
 * Calculates the recommended position size based on account size, risk percentage, 
 * and entry/stop prices
 */
export const calculatePositionSize = (args: {
  account_size: number;
  risk_percentage: number;
  entry_price: number;
  stop_loss_price: number;
}): string => {
  const { account_size, risk_percentage, entry_price, stop_loss_price } = args;
  const riskAmount = account_size * (risk_percentage / 100);
  const priceDifference = Math.abs(entry_price - stop_loss_price);
  const positionSize = riskAmount / priceDifference;
  
  return JSON.stringify({
    position_size: positionSize.toFixed(2),
    risk_amount: riskAmount.toFixed(2),
    units: Math.floor(positionSize),
    explanation: `על בסיס חשבון בגודל $${account_size} וסיכון של ${risk_percentage}%, הסכום המקסימלי לסיכון הוא $${riskAmount.toFixed(2)}. עם כניסה ב-$${entry_price} ו-Stop Loss ב-$${stop_loss_price}, גודל הפוזיציה המומלץ הוא ${positionSize.toFixed(2)} יחידות.`
  });
};

/**
 * Calculates profit targets based on risk/reward ratios and entry/stop prices
 */
export const calculateProfitTargets = (args: {
  entry_price: number;
  stop_loss_price: number;
  risk_reward_ratio_1?: number;
  risk_reward_ratio_2?: number;
  risk_reward_ratio_3?: number;
  is_long?: boolean;
}): string => {
  const { 
    entry_price, 
    stop_loss_price, 
    risk_reward_ratio_1 = 1.5, 
    risk_reward_ratio_2 = 2.5, 
    risk_reward_ratio_3 = 4, 
    is_long = true 
  } = args;
  
  const risk = Math.abs(entry_price - stop_loss_price);
  let target1, target2, target3;
  
  if (is_long) {
    target1 = entry_price + (risk * risk_reward_ratio_1);
    target2 = entry_price + (risk * risk_reward_ratio_2);
    target3 = entry_price + (risk * risk_reward_ratio_3);
  } else {
    target1 = entry_price - (risk * risk_reward_ratio_1);
    target2 = entry_price - (risk * risk_reward_ratio_2);
    target3 = entry_price - (risk * risk_reward_ratio_3);
  }
  
  return JSON.stringify({
    target1: target1.toFixed(2),
    target2: target2.toFixed(2),
    target3: target3.toFixed(2),
    explanation: `עבור ${is_long ? 'פוזיציית לונג' : 'פוזיציית שורט'} עם כניסה ב-$${entry_price} ו-Stop Loss ב-$${stop_loss_price}:
      - יעד רווח ראשון (RR ${risk_reward_ratio_1}): $${target1.toFixed(2)}
      - יעד רווח שני (RR ${risk_reward_ratio_2}): $${target2.toFixed(2)}
      - יעד רווח שלישי (RR ${risk_reward_ratio_3}): $${target3.toFixed(2)}`
  });
};
