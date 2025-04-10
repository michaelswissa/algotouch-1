
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
  'SuccessAndFailDealPage/Success.aspx',
  'thank_you',
  'transaction_completed'
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

// Handle form submissions
function setupFormSubmissionHandlers() {
  // Find all forms in the document
  const forms = document.querySelectorAll('form');
  
  // For each form, attach a submit handler
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      console.log('Payment form submission detected');
      
      // Notify parent window about form submission
      window.parent.postMessage(JSON.stringify({
        type: 'payment_submitted',
        status: 'processing'
      }), '*');
      
      // Create loading overlay if not exists
      let overlay = document.getElementById('payment-processing-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'payment-processing-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.9); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center;';
        
        const spinner = document.createElement('div');
        spinner.style.cssText = 'width: 48px; height: 48px; border: 4px solid rgba(0, 0, 0, 0.1); border-radius: 50%; border-top-color: #3b82f6; animation: spinner 1s linear infinite;';
        
        const message = document.createElement('div');
        message.style.cssText = 'margin-top: 16px; font-size: 18px; color: #111827;';
        message.innerText = 'מעבד תשלום...';
        
        overlay.appendChild(spinner);
        overlay.appendChild(message);
        
        // Add keyframes for spinner animation
        const style = document.createElement('style');
        style.textContent = '@keyframes spinner { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
        
        document.body.appendChild(overlay);
      }
    });
  });
  
  // Also attach click handlers to buttons that might submit payments
  const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], .submit-button, .payment-button, [data-submit="true"]');
  submitButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      console.log('Submit button clicked');
      window.parent.postMessage(JSON.stringify({
        type: 'payment_submitted',
        status: 'processing',
        action: 'button_click'
      }), '*');
    });
  });
}

// Check URL for specific success/error patterns only
function checkUrl(url) {
  // Extract lowProfileId if present
  let lpId = null;
  try {
    const urlObj = new URL(url);
    lpId = urlObj.searchParams.get('lpId');
  } catch(e) {
    console.error('Failed to parse URL:', e);
  }
  
  // Only break out if we see specific success patterns from Cardcom
  if (containsSuccessPattern(url)) {
    console.log('Found success pattern in URL:', url);
    return breakoutToParentWindow(url, lpId);
  }
  
  // Check for error patterns
  if (url.includes('SuccessAndFailDealPage/Fail.aspx') || url.includes('error=true')) {
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

// Set up form submission handlers when DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setupFormSubmissionHandlers();
} else {
  document.addEventListener('DOMContentLoaded', setupFormSubmissionHandlers);
}

// Try to set up forms immediately too
setupFormSubmissionHandlers();

// Observe DOM changes to detect navigation
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    const newUrl = window.location.href;
    lastUrl = newUrl;
    handleUrlChange(newUrl);
  }
  
  // Also check for new forms that might have been dynamically added
  setupFormSubmissionHandlers();
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
    document.querySelector('.transaction-approved')
  ];
  
  if (successElements.some(el => el !== null)) {
    console.log('Success element found in DOM!');
    breakoutToParentWindow(window.location.href);
  }
}, 500);

// Add event listener for messages from parent
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
