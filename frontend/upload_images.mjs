import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://pojinfknlfocjttxirpb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvamluZmtubGZvY2p0dHhpcnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk2NDM1MywiZXhwIjoyMDkwNTQwMzUzfQ.JFcmF2Qz4ZmEsghsioMFYXVHxXxiuF2MSIqdpwVvTcc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const mappings = [
  { source: "C:\\Users\\nikik\\.gemini\\antigravity\\brain\\8b723f16-aad1-49f7-8f74-a898bdc61f9c\\concert_event_demo_1776163685501.png", dest: "1_2.jpg" },
  { source: "C:\\Users\\nikik\\.gemini\\antigravity\\brain\\8b723f16-aad1-49f7-8f74-a898bdc61f9c\\theater_event_demo_1776163750580.png", dest: "2_3.jpg" },
  { source: "C:\\Users\\nikik\\.gemini\\antigravity\\brain\\8b723f16-aad1-49f7-8f74-a898bdc61f9c\\festival_event_demo_1776164124193.png", dest: "3_4.jpg" },
  { source: "C:\\Users\\nikik\\.gemini\\antigravity\\brain\\8b723f16-aad1-49f7-8f74-a898bdc61f9c\\cinema_event_demo_1776164626320.png", dest: "4_5.jpg" },
  { source: "C:\\Users\\nikik\\.gemini\\antigravity\\brain\\8b723f16-aad1-49f7-8f74-a898bdc61f9c\\sports_event_demo_1776164638568.png", dest: "5_2.jpg" }
];

async function run() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === 'events')) {
    console.log('Creating events bucket...');
    await supabase.storage.createBucket('events', { public: true });
  }

  for (const file of mappings) {
    if (!fs.existsSync(file.source)) {
      console.error(`Missing file: ${file.source}`);
      continue;
    }
    const content = fs.readFileSync(file.source);
    
    console.log(`Uploading ${file.dest}...`);
    const { data, error } = await supabase.storage.from('events').upload(file.dest, content, {
      contentType: 'image/jpeg',
      upsert: true
    });
    
    if (error) console.error("Upload Error for", file.dest, error.message);
    else console.log(`✓ Uploaded ${file.dest}`);
  }
}
run();
