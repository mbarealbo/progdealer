export interface User {
  id: string;
  email: string | null;
  created_at?: string;
  updated_at?: string;
  email_confirmed_at?: string | null;
  phone?: string | null;
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  identities?: any[];
  role?: string;
}