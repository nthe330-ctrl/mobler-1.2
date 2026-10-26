/**
 * Machine-readable codes for the errors the Shop Dashboard can run into.
 *
 * Why these exist: the API answers a failure with a human sentence in `error`.
 * That sentence is written in Vietnamese, and the dashboard is now read in four
 * languages, so a Taipei or Bangkok staff member saw a Vietnamese error on an
 * otherwise translated screen. Translating on the server would mean threading
 * `Accept-Language` through every handler and keeping a second dictionary there;
 * sending a stable code and letting the client say it in the reader's language
 * keeps one dictionary, in the app that knows the reader.
 *
 * `error` stays exactly as it was. The customer app, the admin app and the
 * existing tests all read it, and it is the fallback whenever a code is missing
 * or unrecognised — an untranslated sentence beats a blank dialog.
 *
 * Some failures need a value to make sense of ("cannot go from X to Y"). Those
 * ship the parts as separate fields (`detail`) rather than a pre-built sentence,
 * because word order differs per language: Thai and Chinese do not put the two
 * states where Vietnamese does.
 */

export const SHOP_ERROR_CODES = [
  // --- session & permission (auth.ts middleware; reachable on every shop route) ---
  'AUTH_REQUIRED',
  'TOKEN_INVALID',
  'WRONG_ACCOUNT_TYPE',
  'SHOP_FORBIDDEN',
  'SHOP_NOT_FOUND',
  'RATE_LIMITED',

  // --- shop sign-up / sign-in ---
  'OWNER_NAME_REQUIRED',
  'PHONE_INVALID',
  'PASSWORD_TOO_SHORT',
  'EMAIL_INVALID',
  'SHOP_EMAIL_REQUIRED',
  'SHOP_NAME_REQUIRED',
  'SHOP_ADDRESS_REQUIRED',
  'SHOP_ACCOUNT_EXISTS',
  'REGISTER_FAILED',
  'LOGIN_FIELDS_REQUIRED',
  'LOGIN_BAD_CREDENTIALS',
  'LOGIN_WRONG_APP',
  'LOGIN_FAILED',
  'ENDPOINT_RETIRED',
  'USER_NOT_FOUND',

  // --- shop profile & regional settings ---
  'BAD_CURRENCY',

  // --- bookings ---
  'BOOKING_NOT_FOUND',
  'BOOKING_BAD_TRANSITION',
  'NO_SHOW_REVERT_EXPIRED',
  'CHECKIN_REQUIRES_SCAN',
  'CHECKIN_CODE_INVALID',
  'CHECKIN_CODE_MISMATCH',
  'CHECKIN_ALREADY_DONE',
  'CHECKIN_NOT_CONFIRMED',
  'CHECKIN_INVALID_STATUS',

  // --- payment on a booking pre-order ---
  'PAYMENT_INVALID_BOOKING',
  'PAYMENT_NO_ORDER',
  'PAYMENT_ORDER_CANCELLED',

  // --- tables, menu, vouchers, orders, reviews ---
  'TABLE_STATUS_INVALID',
  'TABLE_NOT_FOUND',
  'PRODUCT_NOT_FOUND',
  'ORDER_NOT_FOUND',
  'ORDER_STATUS_INVALID',
  'REVIEW_NOT_FOUND',
  'REPLY_EMPTY',
  'MENU_ITEMS_INVALID',
  'MENU_TOO_MANY',
  'VOUCHER_ITEMS_INVALID',
  'VOUCHER_TOO_MANY',

  // --- image uploads ---
  'UPLOAD_BAD_TYPE',
  'UPLOAD_TOO_LARGE',
  'UPLOAD_FAILED',

  // --- raised on this machine, before anything is sent ---
  'FILE_UNREADABLE',

  // --- rejected before any route saw it (body parser), or by the last-resort handler ---
  'PAYLOAD_TOO_LARGE',
  'BAD_JSON',
  'INTERNAL_ERROR',

  // --- last resort: the request never reached the server ---
  'NETWORK_UNREACHABLE',
  'REQUEST_FAILED'
] as const;

export type ShopErrorCode = (typeof SHOP_ERROR_CODES)[number];

const CODE_SET: ReadonlySet<string> = new Set(SHOP_ERROR_CODES);

export function isShopErrorCode(value: unknown): value is ShopErrorCode {
  return typeof value === 'string' && CODE_SET.has(value);
}

/**
 * The slots a message may fill in. Named rather than positional so each language
 * can put them where its own grammar wants them.
 */
export interface ShopErrorDetail {
  /** BOOKING_BAD_TRANSITION: the status the booking is in now. */
  from?: string;
  /** BOOKING_BAD_TRANSITION: the status that was asked for. */
  to?: string;
  /** CHECKIN_CODE_MISMATCH: the code the selected booking actually expects. */
  expected?: string;
  /** CHECKIN_ALREADY_DONE: the guest's name. */
  name?: string;
  /** CHECKIN_INVALID_STATUS: the status that blocks the check-in. */
  status?: string;
  /** MENU_TOO_MANY / VOUCHER_TOO_MANY / UPLOAD_TOO_LARGE: the limit that was passed. */
  limit?: number | string;
}

/** The error shape every route answers with. `code` is absent on older, non-shop routes. */
export interface ApiErrorBody {
  error: string;
  code?: ShopErrorCode | string;
  detail?: ShopErrorDetail;
  [key: string]: unknown;
}
