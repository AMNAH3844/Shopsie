
const BASE_URL = "https://shopsie-production.up.railway.app";
const API_BASE = `${BASE_URL}/api`;

export const API_URLS = {
  BASE_URL,
  UPLOADS: `${BASE_URL}/uploads`,

  AUTH_SIGNUP: `${API_BASE}/auth/signup`,
  AUTH_SIGNIN: `${API_BASE}/auth/signin`,
  CHECK_USERNAME: `${API_BASE}/auth/check-username`,

  FORGOT_PASSWORD: `${API_BASE}/password/forgot-password`,
  LOOKUP_RESET_EMAIL: `${API_BASE}/password/lookup-email`,
  RESET_PASSWORD: `${API_BASE}/password/reset-password`,

  SETTINGS_UPDATE: `${API_BASE}/settings/update`,
  SETTINGS_UPDATE_PASSWORD: `${API_BASE}/settings/update-password`,
  SETTINGS_DELETE_ACCOUNT: `${API_BASE}/settings/delete-account`,

  NOTIFICATIONS: `${API_BASE}/notifications`,
  NOTIFICATIONS_READ_ALL: `${API_BASE}/notifications/read-all`,
  ADMIN_NOTIFICATIONS: `${API_BASE}/auth/admin/notifications`,
  ADMIN_NOTIFICATIONS_READ_ALL: `${API_BASE}/auth/admin/notifications/read-all`,

  ADMIN: `${API_BASE}/auth/admin`,
  LIST: `${API_BASE}/list`,
  LISTS: `${API_BASE}/list`,
  FRIENDS: `${API_BASE}/friends`,
  INBOX: `${API_BASE}/inbox`,
  CHAT: `${API_BASE}/chat`,
  DOWNLOADS: `${API_BASE}/downloads`,
  DOWNLOADED_LISTS: `${API_BASE}/downloads`,
  SHARE: `${API_BASE}/share`,
  RIDER: `${API_BASE}/rider`,
  RIDER_CHAT: `${API_BASE}/rider/requests`,
  RIDER_HISTORY: `${API_BASE}/rider/history`,
  RIDER_ACCOUNT_DETAILS: `${API_BASE}/rider/me/account-details`,
  RIDER_PROVIDERS: `${API_BASE}/rider/payment-providers`,
  RIDER_OPTIMIZER: `${API_BASE}/rider-optimizer`,
  ROUTE_OPTIMIZE: `${API_BASE}/route-optimize`,
  MY_DELIVERIES: `${API_BASE}/rider/active-deliveries`,
  COMPLETE_ORDER: `${API_BASE}/rider/requests`,

  SHOP_ADD_PRODUCT: `${API_BASE}/shopkeeper/add-product`,
  GET_PRODUCTS: `${API_BASE}/shopkeeper/products`,
  UPDATE_STOCK: `${API_BASE}/shopkeeper/update-stock`,
  DELETE_PRODUCT: `${API_BASE}/shopkeeper/delete-product`,
  SET_THRESHOLD: `${API_BASE}/shopkeeper/set-threshold`,
  SHOP_PROFILE_GET: `${API_BASE}/my-shop-profile`,
  SHOP_PROFILE_UPDATE: `${API_BASE}/my-shop-profile/update`,
  SHOP_REPORTS: `${API_BASE}/shopkeeper/reports`,
  SHOP_ORDERS: `${API_BASE}/shopkeeper/orders`,
  SHOP_NOTIFICATIONS: `${API_BASE}/shopkeeper/notifications`,
  SHOP_REVERT_REQUEST: `${API_BASE}/shopkeeper/revert-request`,

  SHOPKEEPER: {
    NOTIFICATIONS: `${API_BASE}/shopkeeper/notifications`,
    NOTIFICATIONS_READ_ALL: `${API_BASE}/shopkeeper/notifications/read-all`,
    REVERT_REQUEST: `${API_BASE}/shopkeeper/revert-request`,
  },
};
