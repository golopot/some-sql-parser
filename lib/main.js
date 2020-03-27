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


  SELECT * FROM (SELECT * FROM foo)  
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
