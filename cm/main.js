CodeMirror.defineSimpleMode('simplemode', {
  start:[
    {regex:/\/\*.*\*\//, token:'comment'},
    {regex:/\b(CHIP)(\s+)([A-Za-z][A-Za-z0-9]*)/, token:['keyword', null, 'def']},
    {regex:/\b([A-Za-z][A-Za-z0-9]*)*\s*(?=\()/, token:['def', null]},
    {regex:/\b(IN|OUT)\b/, token:'keyword'},
    {regex:/\bPARTS:/, token:'keyword'},
    {regex:/(?:true|false)\b/, token:'atom'},
    {regex:/\.\./, token:'sub-bus'},
    {regex:/\d+/, token:'number'},
    {regex:/=/, token:'eq'},
    {regex:/,/, token:'comma'},
    {regex:/;/, token:'semi'},
    {regex:/\/\/.*/, token:'comment'},
    {regex:/\/(?:[^\\]|\\.)*?\//, token:'variable'},
    {regex:/\/\*/, token:'comment', next:'comment'},
    {regex:/[\{\[\(]/, token:'paren', indent:true},
    {regex:/[\}\]\)]/, token:'paren', dedent:true},
    {regex:/[a-zA-Z][a-zA-Z0-9]*/, token:'variable'},
  ],
  comment: [
    {regex:/.*\*\//, token: "comment", next: "start"},
    {regex:/./, token: "comment"}
  ],
  meta:{dontIndentStates:['comment'], lineComment:'//'}
});

const explains={
  comment:'// or /* ... */',
  keyword:'CHIP|IN|OUT|PARTS:',
  def:'Nand(...)',
  atom:'true|false',
  'sub-bus':'[x..y]',
  number:'16',
  eq:'=',
  comma:',',
  semi:';',
  variable:'a',
  paren:'{([])}'
}

// also cursor: https://discuss.codemirror.net/t/how-can-i-traverse-through-tokens/81/3
const lineTokens=c=>c.doc.children[0].lines.map((_,i)=>c.getLineTokens(i)).map(x=>x.filter(y=>y.type));
function*iterTokens(t){for(let i in t)for(let tk of t[i])yield{...tk,line:+i}}

function parse(tokens){// tokens => ast or parseError
  let i=0;
  const T=[...iterTokens(tokens)].filter(x=>x.type!='comment');

  const peek=(t,v=null,n=0)=>{let ti=T[i+n];if(v && ti.string!=v)return false;return ti.type==t};
  const eat=(t,v=null)=>{
    let ti=T[i++]
    if(ti.type==t){
      if(v && ti.string!=v) throw new Error(`expected ${v}, got ${ti.string}`)
      return ti.string
    }
    throw new Error(`expected ${t}, got '${ti.string}'`)
  };
  const eatWhile=(d,f)=>{let s=[f()];while(peek(...d)){eat(...d);s.push(f())};return s};
  const eatUntil=(d,f)=>{let s=[f()];while(!peek(...d))s.push(f());return s};
  const parseNum=()=>parseInt(eat('number'));
  const parseBool=()=>eat('atom')=='true';

  const parseDecl=()=>{
    let name=eat('variable'),size=1;
    if(peek('paren', '[')){eat('paren');size=parseNum();eat('paren', ']')}
    return {name,size};
  };

  const parseIO=(io='OUT')=>{
    eat('keyword', io);
    const names=eatWhile(['comma'],parseDecl);
    eat('semi');
    return names;
  };

  const parseSide=(checkBool=0)=>{
    if(checkBool && peek('atom'))return{value:parseBool()};
    let name=eat('variable'),n,m;
    if(peek('paren', '[')){
      eat('paren');
      n=parseNum();
      if(peek('sub-bus')){
        eat('sub-bus');
        m=parseNum();
      }
      eat('paren', ']');
    }
    return {name,n,m};
  };

  const parseParam=()=>{
    const lhs=parseSide();
    eat('eq');
    return {lhs,rhs:parseSide(1)};
  };

  const parseWires=()=>eatWhile(['comma'], parseParam);

  const parsePart=()=>{
    const name=eat('def');
    eat('paren', '(');const wires=parseWires();eat('paren', ')');eat('semi');
    return {name,wires};
  };

  const parseParts=()=>eatUntil(['paren', '}'], parsePart);

  const parseChip=()=>{
    eat('keyword', 'CHIP');
    let name=eat('def'),ins,outs,parts;
    eat('paren', '{');
    if(peek('keyword', 'IN')) ins=parseIO('IN');
    outs=parseIO();
    if(peek('keyword', 'IN')) ins=parseIO('IN');
    eat('keyword', 'PARTS:');
    parts=parseParts();
    eat('paren', '}');
    return {name,ins,outs,parts};
  };

  try{return parseChip();}
  catch(parseError){
    console.error(parseError);
    let bad=T[i-1];
    console.log(window.hdl.cm.getLine(bad.line));
    return {name:'Error'};
  }
}

function lintHDL(str,options,editor){} /* => [{message,severity,from,to}*] */

function init(){
  const demo=`/* this is just a demo - replace with your code! */
CHIP Demo { // line comment
  IN a,b,c[2];
  OUT out[2];
  PARTS:
  Nand(a=true, b=false, out=x);
  Nand(a=c[0], b=c[1], out=y);
  And16(a[0..2]=c, b=true, out[0]=x, out[1]=y, out[2..3]=out[0..1]);
}`
  const M=document.getElementById('ta');
  let currentTheme='nord';
  M.value=atob(location.hash.substr(1)) || demo;
  const opts={mode:'simplemode',lineNumbers:true,theme:currentTheme},
        cm=CodeMirror.fromTextArea(M,opts)
  const changeFn=()=>{
    const parsed=parse(lineTokens(cm)),
          name=parsed.name+'.hdl',
          code=cm.getValue(),
          blob=new Blob([code],{type:'text/plain'}),
          dl=document.getElementById('save');
    dl.download=name;
    dl.innerHTML=`Download ${name}`;
    window.URL=window.URL || window.webkitURL;
    dl.href=window.URL.createObjectURL(blob);
    location.hash=btoa(code);
  }
  cm.on('change', changeFn);
  window.hdl={cm,tk:lineTokens(cm)};
  changeFn();
  const changeTheme=()=>{
    const themes=['nord','eclipse'];
    const currentTheme=cm.getOption('theme');
    const newTheme=themes[(themes.indexOf(currentTheme)+1)%themes.length];
    cm.setOption('theme',newTheme);
  };
  if(window.matchMedia){
    let mm=window.matchMedia('(prefers-color-scheme:dark)');
    mm.addEventListener('change',e=>{
      currentTheme=e.matches?'nord':'eclipse';
      cm.setOption('theme', currentTheme);
    });
    cm.setOption('theme', mm.matches?'nord':'eclipse');
  }
  const button=document.getElementById('changeTheme');
  button.addEventListener('click', changeTheme);
}
window.addEventListener('load',init,false);
