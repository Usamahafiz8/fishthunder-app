export interface User {
  id:         number;
  username:   string;
  email:      string;
  role:       { id: number; name: string; slug: string } | null;
  parent_id:  number | null;
  shop_id:    number | null;
  status:     'active' | 'blocked' | 'inactive';
  balance:    string | null;
  currency:   string;
  created_at: string;
  last_login: string | null;
  parents?:   Array<{ id: number; username: string }>;
}

export interface Transaction {
  transaction_id: string;
  user_id:        number;
  admin_id:       number | null;
  type:           'credit' | 'debit' | 'adjustment' | 'system';
  amount:         string;
  balance_before: string;
  balance_after:  string;
  reason:         string;
  reference_id:   string | null;
  status:         'completed' | 'failed' | 'reversed' | 'pending';
  ip_address:     string | null;
  created_at:     string;
}

export interface AuthTokens {
  token:      string;
  expires_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data:    T;
  error:   string | null;
  message: string;
  errors?: Record<string, string[]>;
  meta?: {
    total:        number;
    per_page:     number;
    current_page: number;
    last_page:    number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total:        number;
    per_page:     number;
    current_page: number;
    last_page:    number;
  };
}
