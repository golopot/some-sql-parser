const util = require('util');
const Parser = require('./parser');

function log(arg) {
  console.log(
    util.inspect(arg, {
      colors: true,
      depth: null,
    })
  );
}

function main() {
  const code = `
  INSERT foo VALUES (1) ON DUPLICATE KEY UPDATE a = 1, b = 2;  
  `;
  console.log(code);
  try {
    const ast = Parser.parse(code);
    log(ast);
  } catch (e) {
    console.error(e);
  }
}

main();
