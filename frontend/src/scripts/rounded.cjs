const fs = require('fs');
const path = require('path');
const srcDir = 'd:/Users/Users/eduka/Desktop/App-Gestao Inteligente/src/components';
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const fp = path.join(srcDir, file);
  let content = fs.readFileSync(fp, 'utf8');
  let originalContent = content;
  
  // Replace smaller rounded variants with rounded-2xl for more pronounced curved edges
  content = content.replace(/\brounded-sm\b/g, 'rounded-2xl');
  content = content.replace(/\brounded-md\b/g, 'rounded-2xl');
  content = content.replace(/\brounded-lg\b/g, 'rounded-2xl');
  content = content.replace(/\brounded-0\b/g, 'rounded-2xl');
  content = content.replace(/\brounded-none\b/g, 'rounded-2xl');
  
  // Only replace classNames exactly without evaluating regex in the replacement incorrectly
  const classRegex = /className=["']([^"']+)["']/g;
  let newContent = content.replace(classRegex, (match, classes) => {
    if (
      (classes.includes('bg-white') || 
       classes.includes('bg-gray-') || 
       classes.includes('glass-') || 
       classes.includes('border') || 
       classes.includes('shadow')) &&
      !classes.includes('rounded')
    ) {
      return `className="${classes} rounded-2xl"`;
    }
    return match;
  });
  
  if (originalContent !== newContent) {
    fs.writeFileSync(fp, newContent, 'utf8');
    console.log('Modified', file);
  }
}
