/**
 * Facebook SDK Utility
 * Helper functions for Facebook SDK integration
 */

// Check if Facebook SDK is loaded
export const isFacebookSDKLoaded = () => {
  return typeof window !== 'undefined' && typeof window.FB !== 'undefined';
};

// Wait for Facebook SDK to load
export const waitForFacebookSDK = (timeout = 10000) => {
  return new Promise((resolve, reject) => {
    if (isFacebookSDKLoaded()) {
      resolve(window.FB);
      return;
    }

    const checkInterval = setInterval(() => {
      if (isFacebookSDKLoaded()) {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        resolve(window.FB);
      }
    }, 100);

    const timeoutId = setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Facebook SDK failed to load within timeout'));
    }, timeout);
  });
};

// Get Facebook SDK instance
export const getFacebookSDK = () => {
  if (!isFacebookSDKLoaded()) {
    throw new Error('Facebook SDK is not loaded. Make sure the SDK script is included in index.html');
  }
  return window.FB;
};

// Facebook Login helper
export const facebookLogin = (callback) => {
  waitForFacebookSDK()
    .then((FB) => {
      FB.login(callback, {
        scope: 'pages_show_list,pages_read_engagement,pages_read_user_content,read_insights,instagram_basic,instagram_manage_insights,business_management'
      });
    })
    .catch((error) => {
      console.error('Facebook SDK error:', error);
      if (callback) {
        callback({ error: error.message });
      }
    });
};

// Get Facebook Login Status
export const getFacebookLoginStatus = (callback) => {
  waitForFacebookSDK()
    .then((FB) => {
      FB.getLoginStatus(callback);
    })
    .catch((error) => {
      console.error('Facebook SDK error:', error);
      if (callback) {
        callback({ error: error.message });
      }
    });
};

// Logout from Facebook
export const facebookLogout = (callback) => {
  waitForFacebookSDK()
    .then((FB) => {
      FB.logout(callback);
    })
    .catch((error) => {
      console.error('Facebook SDK error:', error);
      if (callback) {
        callback({ error: error.message });
      }
    });
};

