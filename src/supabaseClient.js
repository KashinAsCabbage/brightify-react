import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ycbykfchnrwatxhfceck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYnlrZmNobnJ3YXR4aGZjZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDg3MjAsImV4cCI6MjA4OTk4NDcyMH0.flUk3i1vsTOK1iesiGGVJsKefom6OpXtGf06aETiBv8';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;