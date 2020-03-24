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
  DELETE FROM table_name WHERE a = 5 ORDER BY a LIMIT 3
  
  
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
