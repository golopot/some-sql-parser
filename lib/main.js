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
  SELECT a.b FROM foo LEFT JOIN A ON a=b;
`;
  const ast = Parser.parse(code);
  console.log(code);
  log(ast);
}

main();
