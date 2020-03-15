const util = require('util');
const Parser = require('./parser');

function main() {
  const code = `
  SELECT a.b FROM foo;
`;
  const ast = Parser.parse(code);
  console.log(code);
  console.log(util.inspect(ast, undefined, null, true));
}

main();
