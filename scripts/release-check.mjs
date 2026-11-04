import fs from 'node:fs';
const must=['index.html','package.json','netlify.toml','src/App.tsx','src/components/WorkshopGuidedReview.tsx','src/components/DraftComparison.tsx','backend-integration/workshop-checks-v1.json','backend-integration/sehs-official-rubric-2026.json'];
for(const p of must)if(!fs.existsSync(p))throw new Error('Missing release file: '+p);
const cat=JSON.parse(fs.readFileSync('backend-integration/workshop-checks-v1.json','utf8'));
const rub=JSON.parse(fs.readFileSync('backend-integration/sehs-official-rubric-2026.json','utf8'));
if(cat.sections.length!==9||cat.sections.reduce((a,s)=>a+s.checks.length,0)!==43)throw Error('Workshop catalogue count mismatch');
if(rub.criteria.length!==4||rub.criteria.some(c=>c.max_marks!==6))throw Error('Official rubric metadata mismatch');
if(fs.existsSync('.env.local'))console.log('NOTE: .env.local exists locally; it is excluded from GitHub and packaging.');
console.log('Release structure OK: 9 sections, 43 checks, 4 official 6-mark criteria.');
