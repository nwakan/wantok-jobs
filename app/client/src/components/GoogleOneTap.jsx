import { useEffect } from 'react';

/**
 * Google One Tap Component
 * 
 * Implements Google Identity Services One Tap sign-in.
 * Shows automatic One Tap prompt on page load + fallback button.
 * 
 * Based on: google_one_tap_react_node_setup_fresh.txt guide
 * 
 * Props:
 * - clientId: Google OAuth Client ID
 * - onSuccess: Callback with Google credential
 * - onError: Callback with error
 * - buttonContainerId: ID of div for fallback button (optional)
 */
export default function GoogleOneTap({ clientId, onSuccess, onError, buttonContainerId = 'google-signin-button' }) {
  useEffect(() => {
    // Check if Google SDK is loaded
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      console.error('Google Identity Services script not loaded.');
      if (onError) {
        onError(new Error('Google SDK not loaded'));
      }
      return;
    }

    try {
      // Initialize Google One Tap
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            if (onSuccess) {
              await onSuccess(response.credential);
            }
          } catch (error) {
            console.error('Google One Tap callback error:', error);
            if (onError) {
              onError(error);
            }
          }
        },
        auto_select: false, // Don't auto-select account
        cancel_on_tap_outside: false // Don't cancel if user taps outside
      });

      // Show One Tap prompt automatically
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed && notification.isNotDisplayed()) {
          console.log('Google One Tap not displayed:', notification.getNotDisplayedReason());
        }
        if (notification.isSkippedMoment && notification.isSkippedMoment()) {
          console.log('Google One Tap skipped:', notification.getSkippedReason());
        }
        if (notification.isDismissedMoment && notification.isDismissedMoment()) {
          console.log('Google One Tap dismissed:', notification.getDismissedReason());
        }
      });

      // Render fallback button
      const buttonDiv = document.getElementById(buttonContainerId);
      if (buttonDiv) {
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'signin_with',
          width: 250
        });
      }
    } catch (error) {
      console.error('Google One Tap initialization error:', error);
      if (onError) {
        onError(error);
      }
    }

    // Cleanup on unmount
    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [clientId, onSuccess, onError, buttonContainerId]);

  // Container for fallback button
  return <div id={buttonContainerId}></div>;
}
