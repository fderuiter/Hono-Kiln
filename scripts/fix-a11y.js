const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      results.push(file);
    }
  });
  return results;
}

const htmlFiles = walk('./docs').filter(f => f.endsWith('.html'));

const injectScript = `
<script id="fix-a11y-script">
  const fixA11y = () => {
    document.querySelectorAll('summary a').forEach(a => {
      const span = document.createElement('span');
      span.innerHTML = a.innerHTML;
      span.className = a.className;
      span.style.cursor = 'pointer';
      span.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = a.href;
      };
      a.replaceWith(span);
    });
  };
  
  fixA11y();
  const observer = new MutationObserver((mutations) => {
    fixA11y();
  });
  observer.observe(document.body, { childList: true, subtree: true });
</script>
</body>
`;

for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/id="tsd-search-input"/g, 'id="tsd-search-input" aria-label="Search"');
  // Remove ANY previously injected script from fixA11y
  content = content.replace(/<script>[^<]*fixA11y[\s\S]*?<\/body>/, '</body>');
  content = content.replace(/<script id="fix-a11y-script">[\s\S]*?<\/body>/, '</body>');
  content = content.replace('</body>', injectScript);
  fs.writeFileSync(file, content, 'utf8');
}

const cssFile = './docs/assets/style.css';
if (fs.existsSync(cssFile)) {
  let css = fs.readFileSync(cssFile, 'utf8');
  css = css.replace(/\/\* A11Y Fixes \*\/[\s\S]*$/, '');
  css += `\n/* A11Y Fixes */\na { color: #0056b3 !important; text-decoration: underline !important; }\n@media (prefers-color-scheme: dark) { a { color: #66b3ff !important; text-decoration: underline !important; } }\nbody[data-theme="dark"] a { color: #66b3ff !important; text-decoration: underline !important; }\n`;
  fs.writeFileSync(cssFile, css, 'utf8');
}
console.log('Accessibility fixes updated.');
