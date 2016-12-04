'use strict';

// Entry file for Markbind project
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const fs = require('fs');

const Parser = require('./lib/parser');

clear();
console.log(
    chalk.yellow(
        figlet.textSync('MarkBind', {horizontalLayout: 'full'})
    )
);

let inputFile = '/home/jason/code/markbind/src/index.html';

let markbindParser = new Parser();
markbindParser.parseFile(inputFile, (error, html) => {
   console.log(html);
});