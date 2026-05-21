import { createClient } from "@supabase/supabase-js";

// These values come from .env.local.
// React only exposes environment variables that start with REACT_APP_.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// This client is the single connection point between the React app and Supabase.
// Other files import "supabase" when they need auth, database rows, or functions.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
