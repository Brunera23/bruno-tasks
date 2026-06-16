const fs = require('fs');
const log = fs.readFileSync('test_output.log', 'utf16le');
fs.writeFileSync('test_output_utf8.log', log, 'utf8');
const txt = fs.readFileSync('test_output.txt', 'utf16le');
fs.writeFileSync('test_output_utf8.txt', txt, 'utf8');
