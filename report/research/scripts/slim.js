const fs=require('fs');
const src=fs.readFileSync('../Sahur_Protocol.html','utf8');
let n=0;
const out=src.replace(/data:([a-z0-9\/+.-]+);base64,[A-Za-z0-9+\/=]+/gi,(m,t)=>{n++;return `data:${t};base64,[${m.length} bytes]`;});
fs.writeFileSync('research/game-slim.html',out);
console.log('replaced',n,'len',src.length,'->',out.length,'lines',out.split('\n').length);
