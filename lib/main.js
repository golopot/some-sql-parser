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


  select a from a as b;
  
  
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
