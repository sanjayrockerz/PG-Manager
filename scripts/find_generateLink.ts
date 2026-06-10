import fs from 'fs';
import path from 'path';

function searchInDir(dir: string, keyword: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchInDir(fullPath, keyword);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(keyword)) {
        console.log(`Found in ${fullPath}`);
      }
    }
  }
}

searchInDir(path.resolve(process.cwd(), 'src'), 'generateLink');
