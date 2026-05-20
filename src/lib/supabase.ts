import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmqxrspopdvewgcyvsdn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcXhyc3BvcGR2ZXdnY3l2c2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Njk3OTAsImV4cCI6MjA5NDU0NTc5MH0.WWP00Y8C7xCCuQj1vFXdEOOQ9NBr4pevan72mcu-AA8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
