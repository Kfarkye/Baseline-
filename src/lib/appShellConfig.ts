const PRIVACY_POLICY_FALLBACK = "https://example.com/baseline/privacy-policy";
const TERMS_OF_SERVICE_FALLBACK = "https://example.com/baseline/terms-of-service";
const APP_SUPPORT_FALLBACK = "https://example.com/baseline/support";

export const APP_SHELL_LINKS = {
  privacyPolicyUrl: import.meta.env.VITE_PRIVACY_POLICY_URL || PRIVACY_POLICY_FALLBACK,
  termsOfServiceUrl: import.meta.env.VITE_TERMS_OF_SERVICE_URL || TERMS_OF_SERVICE_FALLBACK,
  appSupportUrl: import.meta.env.VITE_APP_SUPPORT_URL || APP_SUPPORT_FALLBACK,
};

export const IOS_WRAPPER_NOTE = "iOS wrapper-ready shell; App Store commerce review required.";
