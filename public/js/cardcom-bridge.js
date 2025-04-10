
// This script will be injected into the Cardcom LowProfile iframe
// It sends the payment token back to the parent window via postMessage

(function() {
  // Function to get URL parameters
  function getParamFromUrl(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
  
  // Get the parent origin from the URL parameter
  const parentOrigin = decodeURIComponent(getParamFromUrl('origin') || window.location.origin);
  
  // Listen for form submission to intercept the payment result
  document.addEventListener('DOMContentLoaded', function() {
    // For successful payments, look for the success message or redirect
    const observer = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.addedNodes) {
          for (const node of mutation.addedNodes) {
            // Check for success messages
            if (node.nodeType === Node.ELEMENT_NODE) {
              const successElement = node.querySelector('.success-message') || 
                                     node.querySelector('[data-success="true"]') ||
                                     node.querySelector('.payment-success');
                                     
              if (successElement) {
                // Extract payment info from the page
                const token = getParamFromUrl('token') || 
                             document.querySelector('[data-token]')?.getAttribute('data-token');
                             
                // Send token back to parent
                if (token) {
                  window.parent.postMessage({
                    Token: token,
                    CardNumber: document.querySelector('[data-last4]')?.getAttribute('data-last4'),
                    CardMonth: document.querySelector('[data-month]')?.getAttribute('data-month'),
                    CardYear: document.querySelector('[data-year]')?.getAttribute('data-year'),
                    CardOwnerName: document.querySelector('[data-name]')?.getAttribute('data-name')
                  }, parentOrigin);
                }
              }
              
              // Check for error messages
              const errorElement = node.querySelector('.error-message') || 
                                   node.querySelector('[data-error="true"]') ||
                                   node.querySelector('.payment-error');
                                   
              if (errorElement) {
                const errorMsg = errorElement.textContent || 'Payment failed';
                window.parent.postMessage({
                  Error: errorMsg
                }, parentOrigin);
              }
            }
          }
        }
      }
    });
    
    // Start observing changes to the DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Monitor forms for submission
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', function() {
        // Notify parent that the form is processing
        window.parent.postMessage({
          Status: 'processing'
        }, parentOrigin);
      });
    });
  });
})();
