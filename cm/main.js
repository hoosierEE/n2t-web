CodeMirror.defineSimpleMode('simplemode', {
  start:[
    {regex:/(\bCHIP\b)(\s+)([a-z$][a-zA-Z0-9]*)/, token:['keyword',null,'variable-2']},
    {regex:/(?:CHIP|IN|OUT)\b/, token:'keyword'},
    {regex:/\bPARTS:/, token:'keyword'},
    {regex:/(?:true|false)\b/, token:'atom'},
    {regex:/\.\./, token:'sub-bus'},
    {regex:/\d+/, token:'number'},
    {regex:/=/, token:'eq'},
    {regex:/,/, token:'comma'},
    {regex:/;/, token:'semi'},
    {regex:/\/\/.*/, token:'comment'},
    {regex:/\/(?:[^\\]|\\.)*?\//, token:'variable-3'},
    {regex:/\/\*/, token:'comment', next:'comment'},
    {regex:/[\{\[\(]/, token:'paren', indent:true},
    {regex:/[\}\]\)]/, token:'paren', dedent:true},
    {regex:/[a-zA-Z][a-zA-Z0-9]*/, token:'variable'},
    // {regex:/\s+/, token:'space'},
  ],
  comment:[
    {regex:/.*?\*\//, token:'comment', next:'start'},
    {regex:/.*/, token:'comment'}
  ],
  meta:{dontIndentStates:['comment'], lineComment:'//'}
});

function lineTokens(cm){
  // also cursor: https://discuss.codemirror.net/t/how-can-i-traverse-through-tokens/81/3
  let tk=cm.doc.children[0].lines.map((_,i)=>cm.getLineTokens(i)).map(x=>x.filter(y=>y.type))
  // for(let i in tk) for(let o of tk[i]) o.line=i|0
  return tk
}

function*iterTokens(t){for(let i in t)for(let tk of t[i])yield{...tk,line:+i}}

function parse(tokens){// tokens => ast or parseError
  let i=0
  const LEFT=0,RIGHT=1,T=[...iterTokens(tokens)]

  const peek=(t,v=null,n=0)=>{let ti=T[i+n];if(v && ti.string!=v)return false;return ti.type==t}
  const eat=(t,v=null)=>{
    let ti=T[i++]
    if(ti.type==t){if(v && ti.string!=v)throw`expected ${v}, got ${ti.string}`;return ti.string}
    throw`expected ${t}, got ${ti.string}`
  }
  const parseNum=()=>parseInt(eat('number'))
  const parseBool=()=>eat('atom')=='true'

  const parseDecl=()=>{
    let name=eat('variable'),size=1
    if(peek('paren', '[')){eat('paren');size=parseNum();eat('paren', ']')}
    return {name,size}
  }

  const parseIO=(io='OUT')=>{
    eat('keyword', io)
    const names=[]
    names.push(parseDecl())
    while(peek('comma')){eat('comma');names.push(parseDecl())}
    eat('semi')
    return names
  }

  const parseSide=(checkBool=0)=>{
    if(checkBool && peek('atom'))return {value:parseBool()}
    let name=eat('variable'),n,m
    if(peek('paren', '[')){
      eat('paren')
      n=parseNum()
      if(peek('sub-bus')){
        eat('sub-bus')
        m=parseNum()
      }
      eat('paren', ']')
    }
    return {name,n,m}
  }

  const parseParam=()=>{
    const lhs=parseSide()
    eat('eq')
    return {lhs,rhs:parseSide(1)}
  }

  const parseWires=()=>{
    const params=[parseParam()]
    while(peek('comma')){eat('comma');params.push(parseParam())}
    return params
  }

  const parsePart=()=>{
    const name=eat('variable')
    eat('paren', '(');const wires=parseWires();eat('paren', ')');eat('semi')
    return {name,wires}
  }

  const parseParts=()=>{
    const parts=[]
    parts.push(parsePart())
    while(!peek('paren', '}')) parts.push(parsePart())
    return parts
  }

  const parseChip=()=>{
    eat('keyword', 'CHIP')
    const name=eat('variable')
    eat('paren', '{')
    const ins=parseIO('IN'), outs=parseIO()
    eat('keyword', 'PARTS:')
    const parts=parseParts()
    eat('paren', '}')
    return {name,ins,outs,parts}
  }

  try{return parseChip()}
  catch(parseError){
    console.log(parseError)
    console.log(window.hdl.cm.getLine(T[i-1].line))
  }
}

function init(){
  const code=`CHIP Foo {
  IN a,b,c[2];
  OUT out[2];
  PARTS:
  Nand(a=true, b=false, out=x);
  Nand(a=c[0], b=c[1], out=y);
  And16(a[0..2]=c, b[2..15]=false, out[0]=x, out[1]=y, out[2..3]=out[0..1]);
}`
  const M=document.getElementById('ta');M.value=code
  const cm=CodeMirror.fromTextArea(M,{mode:'simplemode', lineNumbers:true, theme:'nord'}),
        tk=lineTokens(cm)
  window.hdl={cm, tk}
  console.log(parse(tk))
  // for(let t of iterTokens(tk)){console.log(t)}
}
window.addEventListener('load', init, false)
