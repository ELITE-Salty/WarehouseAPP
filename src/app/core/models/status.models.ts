export type OrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'READY_FOR_SIGNATURE'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderType = 'INBOUND' | 'OUTBOUND';

export type LowStockAlertStatus = 'OPEN' | 'EMAILED' | 'RESOLVED';

export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export type BillingStatus =
  | 'DRAFT'
  | 'CALCULATED'
  | 'LOCKED'
  | 'INVOICED'
  | 'PAID'
  | 'CANCELLED';

export type DocumentType =
  | 'CMR'
  | 'DELIVERY_NOTE'
  | 'PICKUP_NOTE'
  | 'ORDER_LIST'
  | 'OTHER';

export type AppStatus =
  | OrderStatus
  | LowStockAlertStatus
  | EmailStatus
  | BillingStatus;