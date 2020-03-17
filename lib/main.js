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
  SSSSS foo FROM b;
`;
  const ast = Parser.parse(code);
  console.log(code);
  log(ast);
}

main();
