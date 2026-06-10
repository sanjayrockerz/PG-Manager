import net from 'net';
import dns from 'dns/promises';

const regions = [
  'ap-south-1', // Mumbai
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'eu-central-1', // Frankfurt
  'eu-west-1', // Ireland
  'eu-west-2', // London
  'us-east-1', // N. Virginia
  'us-east-2', // Ohio
  'us-west-1', // N. California
  'us-west-2', // Oregon
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'sa-east-1', // São Paulo
  'ca-central-1', // Canada
  'eu-west-3', // Paris
  'eu-north-1', // Stockholm
  'me-central-1', // Dubai
  'af-south-1', // Cape Town
  'ap-south-2', // Hyderabad
];

async function probe() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    try {
      await dns.lookup(host);
      console.log(`Region ${region} resolves.`);
      
      const socket = net.createConnection({ host, port: 6543 });
      socket.setTimeout(3000);
      
      const success = await new Promise((resolve) => {
        socket.on('connect', () => {
          const tenant = 'postgres.krkzklxfczukvllhucsg';
          const database = 'postgres';
          const userStr = `user\0${tenant}\0database\0${database}\0\0`;
          const len = 8 + userStr.length;
          const buf = Buffer.alloc(len);
          buf.writeInt32BE(len, 0);
          buf.writeInt32BE(196608, 4);
          buf.write(userStr, 8);
          socket.write(buf);
        });
        
        socket.on('data', (data) => {
          const str = data.toString('utf8');
          if (str.includes('not found') || str.includes('tenant/user')) {
            resolve(false);
          } else {
            resolve(true);
          }
          socket.end();
        });
        
        socket.on('error', () => resolve(false));
        socket.on('timeout', () => {
          socket.end();
          resolve(false);
        });
      });
      
      if (success) {
        console.log(`>>> FOUND REGION: ${region} <<<`);
        return;
      }
    } catch (err) {
      // ignore lookup failures
    }
  }
  console.log('No region found.');
}

probe().catch(console.error);
