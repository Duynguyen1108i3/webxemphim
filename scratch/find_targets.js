const fs = require('fs');
const content = fs.readFileSync('scratch/netflopp_beautified.js', 'utf8');

const targets = ['Ra =', 'Ce =', 'Fa =', 'Ba =', 'Va =', 'qa =', 'Wa =', 'Za =', 'er =', 'Ja =', 'Ya =', 'Xa =', 'Qa =', 'Ka =', 'Ga =', 'Da ='];

for (const t of targets) {
  const idx = content.indexOf(t);
  if (idx !== -1) {
    const lineNum = content.slice(0, idx).split('\n').length;
    console.log(`${t} found at line ${lineNum}`);
  } else {
    console.log(`${t} NOT found directly`);
  }
}
