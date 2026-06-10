import dns from 'dns';
import http from 'https';

console.log('Resolving supabase URL...');
dns.lookup('krkzklxfczukvllhucsg.supabase.co', (err, address, family) => {
  console.log('krkzklxfczukvllhucsg.supabase.co:', err ? err.message : address);
});

dns.lookup('db.krkzklxfczukvllhucsg.supabase.co', (err, address, family) => {
  console.log('db.krkzklxfczukvllhucsg.supabase.co:', err ? err.message : address);
});

// Try DoH (DNS over HTTPS) in case local DNS blocks it
const queryDoH = (name) => {
  http.get(`https://dns.google/resolve?name=${name}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`DoH for ${name}:`, json.Answer ? json.Answer.map(a => a.data) : 'No Answer');
      } catch (e) {
        console.log(`DoH failed for ${name}:`, e.message);
      }
    });
  }).on('error', (err) => {
    console.log(`DoH request failed for ${name}:`, err.message);
  });
};

queryDoH('db.krkzklxfczukvllhucsg.supabase.co');
queryDoH('krkzklxfczukvllhucsg.supabase.co');
