import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://pojinfknlfocjttxirpb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvamluZmtubGZvY2p0dHhpcnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk2NDM1MywiZXhwIjoyMDkwNTQwMzUzfQ.JFcmF2Qz4ZmEsghsioMFYXVHxXxiuF2MSIqdpwVvTcc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('Updating live database events table...');
  const { data: events, error: fetchError } = await supabase.from('events').select('id_event, picture');
  if (fetchError) {
    console.error('Error fetching events:', fetchError); 
    return;
  }
  
  let count = 0;
  for (const ev of events) {
    // If the picture is a relative path 'events/...', we make it absolute using the new Supabase Storage URL
    if (ev.picture && ev.picture.startsWith('events/')) {
      const newPic = SUPABASE_URL + '/storage/v1/object/public/' + ev.picture;
      await supabase.from('events').update({ picture: newPic }).eq('id_event', ev.id_event);
      count++;
    }
  }
  console.log(`Live database updated: Fixed ${count} events.`);

  console.log('Updating local SQL migration seeds...');
  const prefix = SUPABASE_URL + "/storage/v1/object/public/";
  const files = [
    '../supabase/schema.sql',
    '../supabase/migrations/20260408004000_seed_initial_events.sql'
  ];
  for (const f of files) {
    if (fs.existsSync(f)) {
      let content = fs.readFileSync(f, 'utf8');
      content = content.replace(/'events\/([^']+)'/g, `'${prefix}events/$1'`);
      fs.writeFileSync(f, content);
      console.log('Updated ' + f);
    }
  }
  console.log('Done.');
}
run();
