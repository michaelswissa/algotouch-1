
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

// Force break out of all iframes to parent window
function breakoutToParentWindow(url, lpId) {
  console.log('Breaking out of iframe to parent window with URL:', url);
  
  // Create the final destination URL with all necessary parameters
  const finalUrl = new URL(window.location.origin + '/subscription');
  finalUrl.searchParams.set('step', 'completion');
  finalUrl.searchParams.set('success', 'true');
  finalUrl.searchParams.set('force_top', 'true');
  
  // Add the lowProfileId if present
  if (lpId) {
    finalUrl.searchParams.set('lpId', lpId);
  }
  
  // Try multiple approaches to break out of iframe
  
  // Approach 1: Post message to parent window
  window.parent.postMessage(JSON.stringify({
    type: 'cardcom_redirect',
    url: finalUrl.toString(),
    success: true,
    forceRedirect: true,
    lowProfileId: lpId
  }), '*');
  
  // Approach 2: Try direct top location change
  try {
    if (window.top) {
      window.top.location.href = finalUrl.toString();
    }
  } catch(e) {
    console.error('Failed to redirect top window', e);
  }
  
  // Approach 3: Use window.open with _top
  try {
    window.open(finalUrl.toString(), '_top');
  } catch(e) {
    console.error('Failed window.open approach', e);
  }
  
  // Approach 4: Create and click a link element
  try {
    const link = document.createElement('a');
    link.href = finalUrl.toString();
    link.target = '_top';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch(e) {
    console.error('Failed link click approach', e);
  }
  
  return true;
}

// Check URL immediately
function checkUrl(url) {
  // Extract lowProfileId if present
  let lpId = null;
  try {
    const urlObj = new URL(url);
    lpId = urlObj.searchParams.get('lpId');
  } catch(e) {
    console.error('Failed to parse URL:', e);
  }
  
  // Check for success patterns
  if (containsSuccessPattern(url) || url.includes('success=true')) {
    console.log('Found success pattern in URL:', url);
    return breakoutToParentWindow(url, lpId);
  }
  
  // Check for error patterns
  if (url.includes('error=true')) {
    console.log('Found error in URL:', url);
    
    // Handle error case similarly but with error flag
    const finalUrl = new URL(window.location.origin + '/subscription');
    finalUrl.searchParams.set('step', 'payment');
    finalUrl.searchParams.set('error', 'true');
    finalUrl.searchParams.set('force_top', 'true');
    
    // Try to break out with error URL
    try {
      window.top.location.href = finalUrl.toString();
    } catch(e) {
      console.error('Failed to redirect on error', e);
      window.open(finalUrl.toString(), '_top');
    }
    
    return true;
  }
  
  return false;
}

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

// Start observing
observer.observe(document, { subtree: true, childList: true });

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
    breakoutToParentWindow(window.location.href);
  }
  
  // Check for form submissions with successful results
  const forms = document.querySelectorAll('form[action*="success"]');
  if (forms.length > 0) {
    console.log('Success form detected!');
    breakoutToParentWindow(window.location.href);
  }
}, 500);

// Add event listener for messages from Cardcom script
window.addEventListener('message', function(event) {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (data && (data.success === true || data.status === 'success')) {
      console.log('Success message received:', data);
      breakoutToParentWindow(window.location.href, data.lowProfileId);
    }
  } catch(e) {
    // Not our message or not JSON, ignore
  }
});
`;

export default getIframeBreakoutScript;
