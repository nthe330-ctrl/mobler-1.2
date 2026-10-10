export type TableStatus = 'available' | 'occupied' | 'reserved' | 'locked' | 'broken';

export interface ReservationSlot {
  id: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  seats: number;
  note?: string;
  status: 'confirmed' | 'cancelled' | 'seated';
}

export interface Table {
  id: string;
  name: string;
  seats: number;
  status: TableStatus;
  reservationTime?: string;
  futureReservations?: ReservationSlot[];
  historyByHour?: Record<string, TableStatus>;
}

export interface OrderItem {
  menuItemId?: string;
  name?: string;
  quantity: number;
  price?: number;
  image?: string;
  note?: string;
  size?: string;
  sugar?: string;
  ice?: string;
}

export interface Order {
  id: string;
  orderCode?: string;
  tableId: string;
  tableName?: string;
  bookerName?: string;
  bookerAvatar?: string;
  bookerMilestone?: string;
  time: string;
  checkInTime?: string;
  status: 'pending' | 'preparing' | 'served' | 'paid';
  total: number;
  items: OrderItem[];
  note?: string;
}

export interface MenuItemSizeOption {
  id?: string;
  sizeCode: string;
  name: string;
  price: number;
  isDefault?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  isAvailable: boolean;
  image: string;
  description?: string;
  allowSizeCustomization?: boolean;
  sizeOptions?: MenuItemSizeOption[];
  defaultSize?: string;
  allowSugarCustomization?: boolean;
  sugarOptions?: string[];
  defaultSugar?: string;
  allowIceCustomization?: boolean;
  iceOptions?: string[];
  defaultIce?: string;
  tags?: string[];
}

export type DiscountType = 'percent' | 'fixed' | 'same_price' | 'free_item';
export type VoucherStatus = 'active' | 'scheduled' | 'paused' | 'expired';
export type CustomerSegmentKey = 'new_customers' | 'regular' | 'vip_members' | 'top_spenders';
export type TargetAudience = 'all' | CustomerSegmentKey;

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderValue: number;
  targetAudience: TargetAudience;
  applyToAllCustomers?: boolean;
  targetAudiences?: CustomerSegmentKey[];
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  perCustomerLimit: number;
  status: VoucherStatus;
  bannerImage?: string;
  applicableCategory?: string;
  tags?: string[];
}

export interface CustomerReviewItem {
  id: string;
  author: string;
  avatar: string;
  time: string;
  rating: number;
  content: string;
  image?: string;
  likes: number;
  orderInfo?: string;
  achievement?: string;
  comments: { id: string; user: string; avatar: string; text: string }[];
}

export interface Review {
  id: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  shopReply?: {
    content: string;
    date: string;
  };
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  visitCount: number;
  totalSpent: number;
  points: number;
  favoriteItems: string[];
  joinDate: string;
  lastVisit: string;
}

export interface ShopInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  openTime: string;
  closeTime: string;
  rating: number;
  reviewCount: number;
  bannerImage?: string;
  description?: string;
  amenities?: string[];
}

export interface StoreProfile {
  name: string;
  address: string;
  description: string;
  characteristics: string[];
  images: string[];
}

