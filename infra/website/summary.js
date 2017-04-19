let fs = require('fs');

let marked = require('marked');


function main () {
  let a = fs.readFileSync('./CONTRIBUTORS.md', {
    encoding: 'utf-8',
  });
  let b = marked.lexer(a);
  console.info(b);

  let c = marked.parser(b);
  console.info(c);
}


main();
