import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase Project URL and Anon Key
const supabaseUrl = 'https://puxuxqairoozswasgclx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eHV4cWFpcm9venN3YXNnY2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzMwOTIsImV4cCI6MjA4OTU0OTA5Mn0.YIRrYr61-F5q0sRWVaUT3SGshJ7t1tAlV2seVl9Tjf8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);