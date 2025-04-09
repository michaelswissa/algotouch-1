
/**
 * This file contains the script that will be injected into the iframe to detect
 * successful payment completion and break out of the iframe.
 */

export const getIframeBreakoutScript = () => `
// Monitor URL changes
let lastUrl = window.location.href;
console.log('Iframe URL monitor initialized:', lastUrl);

// Success patterns to watch for
const SUCCESS_PATTERNS = [
  'success=true',
  'step=completion',
  'SuccessAndFailDealPage/Success.aspx',
  'payment_success',
  'transaction_completed',
  'thank_you'
];

// Check if URL contains any success pattern
function containsSuccessPattern(url) {
  return SUCCESS_PATTERNS.some(pattern => url.includes(pattern));
}

// Check URL immediately
const checkUrl = (url) => {
  if (containsSuccessPattern(url) || url.includes('success=true') || url.includes('error=true')) {
    console.log('Found success/error in URL:', url);
    
    // Add target=_top if not present
    const finalUrl = new URL(url);
    finalUrl.searchParams.set('target', '_top');
    finalUrl.searchParams.set('success', 'true'); // Force success flag
    
    // Extract the lowProfileId if present
    const urlParams = new URLSearchParams(finalUrl.search);
    const lpId = urlParams.get('lpId');
    
    // Send message to parent window
    window.parent.postMessage(JSON.stringify({
      type: 'cardcom_redirect',
      url: finalUrl.toString(),
      success: true,
      forceRedirect: true,
      lowProfileId: lpId
    }), '*');
    
    // Try direct navigation to break out of iframe
    try {
      if (window.top && window !== window.top) {
        window.top.location.href = finalUrl.toString();
      }
    } catch(e) {
      console.error('Failed to redirect top window', e);
      
      // Try alternate approach to break out
      const topUrl = window.location.origin + '/subscription?step=completion&success=true';
      const link = document.createElement('a');
      link.href = topUrl;
      link.target = '_top'; 
      link.click();
    }
    
    return true;
  }
  return false;
};

// Check URL immediately
checkUrl(lastUrl);

// Function to handle URL changes
function handleUrlChange(newUrl) {
  console.log('URL changed in iframe:', newUrl);
  checkUrl(newUrl);
}

// Observe DOM changes to detect navigation
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    const newUrl = window.location.href;
    lastUrl = newUrl;
    handleUrlChange(newUrl);
  }
});

// Check URL every 500ms as a fallback
setInterval(() => {
  if (window.location.href !== lastUrl) {
    const newUrl = window.location.href;
    lastUrl = newUrl;
    handleUrlChange(newUrl);
  }
  
  // Also look for common success indicators in DOM
  const successElements = [
    document.querySelector('.payment-success'),
    document.querySelector('.success-message'),
    document.querySelector('[data-payment-status="success"]'),
    document.querySelector('.transaction-approved'),
    document.querySelector('.approved-transaction')
  ];
  
  if (successElements.some(el => el !== null)) {
    console.log('Success element found in DOM!');
    // Force success redirect
    const topUrl = window.location.origin + '/subscription?step=completion&success=true';
    window.parent.postMessage(JSON.stringify({
      type: 'cardcom_redirect',
      url: topUrl,
      success: true,
      forceRedirect: true
    }), '*');
    
    try {
      window.top.location.href = topUrl;
    } catch(e) {
      console.error('Failed to redirect top window from success element', e);
    }
  }
}, 500);

// Start observing
observer.observe(document, { subtree: true, childList: true });
`;

export default getIframeBreakoutScript;
