'use strict'
// Grammar
// Prog    := Chip+
// Comment := ('//' .*$) | ('/*' .* '*/')
// Chip    := 'CHIP' Name '{' InOut 'PARTS:' Part+ '}'
// InOut   := ('IN' SigDecl (',' SigDecl)* ';')? 'OUT' SigDecl (, SigDecl)* ';'
// Part    := Name '(' Param (',' Param)* ')' ';'
// Param   := Signal '=' (Signal | Boolean)
// SigDecl := Name ('[' Integer ']')?
// Signal  := Name ('[' Integer ('..' Integer)? ']')?
// Boolean := 'false' | 'true'
// Integer := [1-9][0-9]*
// Name    := [a-zA-Z][a-zA-Z0-9]*

// helpers
const zip=(a,b)=>[...Array(Math.min(a.length,b.length))].map((_,i)=>[a[i],b[i]])
const scan=(arr,op,init)=>arr.reduce((a,x)=>[...a,op(a[a.length-1],x)],[init])
const iota=x=>[...Array(x).keys()]
const json=x=>JSON.stringify(x,null,4)

// config
let INDENT='  '
const [boo,cml,cmr,cmt,com,cuL,cuR,equ,err,key,lin,nom,num,paL,paR,rng,sem,spc,sqL,sqR]=
      'boo,cml,cmr,cmt,com,cuL,cuR,equ,err,key,lin,nom,num,paL,paR,rng,sem,spc,sqL,sqR'.split(',')

const PATTERNS=[
  [/(?:CHIP|IN|OUT)\b/, key]
  ,[/\bPARTS:/,         key]
  ,[/\n/,               lin]
  ,[/\s+/,              spc]
  ,[/true|false/,       boo]
  ,[/[0-9]+/,           num]
  ,[/\.\./,             rng]
  ,[/=/,                equ]
  ,[/,/,                com]
  ,[/;/,                sem]
  ,[/\/\/.*/,           cmt]
  ,[/\/\*/,             cml]
  ,[/\*\//,             cmr]
  ,[/\{/,               cuL]
  ,[/\}/,               cuR]
  ,[/\(/,               paL]
  ,[/\)/,               paR]
  ,[/\[/,               sqL]
  ,[/\]/,               sqR]
  ,[/[A-Za-z]\w*/,      nom]
  ,[/./,                err]]

function tokenize(s){
  let iscom=0,line=1,col=1,tokens=[],tx=[]
  while(s){
    let r,k,m=s.length,err=0
    for(let [x,y] of PATTERNS)if((r=x.exec(s))&&r.index<m){k=[r[0],y];m=r.index}
    tokens.push(k)
    s=s.substr(m+(k?k[0].length:0))
  }
  // comments,lines,columns
  for(let [x,y] of tokens){
    if(cml==y){y=cmt;iscom=1}
    if(cmr==y){y=cmt;iscom=0}
    if(iscom && lin!=y && spc!=y) y=cmt
    // if((iscom+=(cml==y)-(cmr==y)) && lin!=y || cmr==y) y=cmt
    if(lin==y){line++;col=0}
    tx.push([x,y,line,col])
    col+=x.length
  }
  return tx
}

function parse(tokens){
  let i=0
  const T=tokens.filter(x=>[cmt,lin,spc].every(y=>y!=x[1]))
  try{
    const peek=(typ,n=0)=>{if(i>=T.length)throw`expected ${typ}, got EOF`;return T[i+n][1]==typ}
    const eat=(typ,x=null)=>{
      if(peek(typ)&&(x&&x==T[i][0])||typ==T[i][1])
        return T[i++]
      throw`expected ${x||typ}, got ${T[i]}`
    }
    const parseNum=()=>parseInt(eat(num)[0])
    const parseBool=()=>eat(boo)[0]=='true'
    const parseName=()=>eat(nom)[0]

    const parseDef=()=>{
      let D={name:parseName(),size:1}
      if(peek(sqL)){
        eat(sqL)
        D.size=parseNum()
        eat(sqR)
      }return D
    }

    const parseIO=()=>{
      let L=[parseDef()]
      while(peek(com)){
        eat(com)
        L.push(parseDef())
      }return L
    }

    const parseSide=(side=0)=>{
      let begin=0,size=1,name
      if(side && peek(boo)) return{name:parseBool(),begin,size}
      name=parseName()
      if(peek(sqL)){
        eat(sqL)
        begin=parseNum()
        if(peek(rng)){
          eat(rng)
          let upper=parseNum()
          if(begin>=upper) throw`In sub-bus [n..m], n should be < m, but got [${T[i-2]}..${T[i]}].`
          size=upper-begin+1
        }
        eat(sqR)
      }return {name,begin,size}
    }

    const parseParams=()=>{
      let L=[parseSide()],R=[],z
      eat(equ)
      R.push(parseSide(1))
      while(peek(com)){eat(com);L.push(parseSide());eat(equ);R.push(parseSide(1))}
      return zip(L,R).map(x=>({lhs:x[0], rhs:x[1]}))
    }

    const parsePart=()=>{
      let name=parseName()
      eat(paL);let params=parseParams();eat(paR);eat(sem)
      return{name,params}
    }

    const parseChip=()=>{
      eat(key,'CHIP')
      let d={name:parseName()}
      eat(cuL)
      eat(key,'IN');d.inputs=parseIO();eat(sem)
      eat(key,'OUT');d.outputs=parseIO();eat(sem)
      eat(key,'PARTS:');d.parts=[];while(!peek(cuR)){d.parts.push(parsePart())}
      eat(cuR)
      return d
    }

    return parseChip() // entry point
  }
  catch(ParseError){return ParseError} // return T.slice(0,i)
}

function render(tokens){
  let ind='',indent=0,s='',c=0,iserr=0
  for(let i in tokens){
    let [v,t]=tokens[i], tp=tokens[i-1]; tp=tp&&tp[1]
    ind=INDENT.repeat(indent+=(t.endsWith('L'))-(t.endsWith('R'))).repeat('lin'==tp)
    let errClass=' nt-err'.repeat(iserr|=err==t)
    if([key,boo,num,cmt,nom,rng].some(x=>t==x)) s+=`${ind}<span class="nt-${t}${errClass}">${v}</span>`
    else s+=v
  }
  return s
}

const code=`CHIP Foo {
/* multiple
line
comment
*/
IN a[3],b; // line comment
OUT out;
PARTS:
Foo16(a=a, b[1..2]=x[2..3], out=n);
Nand(a=false, b=n, out=out);
}`

// https://stackoverflow.com/a/66082357/2037637
function tilEnd(parent,endNode,offset,cst={cnt:0}){
  for(let n of parent.childNodes){
    if(cst.done) break
    if(n===endNode) {cst.done=true; cst.offsetInNode=offset; return cst}
    if(n.nodeType===Node.TEXT_NODE) {cst.offsetInNode=offset; cst.cnt+=n.length}
    else if(n.nodeType===Node.ELEMENT_NODE) tilEnd(n,endNode,offset,cst)
  }
  return cst
}

function tilOffset(parent,offset,cst={cnt:0}){
  for(let n of parent.childNodes){
    if(cst.done) break
    if(n.nodeType===Node.TEXT_NODE){
      if(cst.cnt<=offset && offset<cst.cnt+n.length) {
        cst.offsetInNode=offset-cst.cnt
        cst.n=n
        cst.done=true
        return cst
      }
      else cst.cnt+=n.length
    }
    else if(n.nodeType===Node.ELEMENT_NODE) tilOffset(n,offset,cst)
  }
  return cst
}

function getCaret(){
  let editor=document.getElementById('editor'), sel=window.getSelection();
  if(sel.rangeCount===0) return null
  let range=sel.getRangeAt(0),
      beg=tilEnd(editor,range.startContainer,range.startOffset),
      end=tilEnd(editor,range.endContainer,range.endOffset),
      offsCounts={beg:beg.cnt+beg.offsetInNode, end:end.cnt+end.offsetInNode}
  return {beg,end,offsets:offsCounts}
}

function setCaret(beg, end){
  let editor=document.getElementById('editor'), sel=window.getSelection();
  if(sel.rangeCount===0) return null
  let range = sel.getRangeAt(0),
      begNode = tilOffset(editor, beg),
      endNode = tilOffset(editor, end),
      newRange = new Range()
  newRange.setStart(begNode.node, begNode.offsetInNode)
  newRange.setEnd(endNode.node, endNode.offsetInNode)
  sel.removeAllRanges()
  sel.addRange(newRange)
  return true
}

const D=document,
      ln=D.getElementById('linenum'),
      ed=D.getElementById('editor'),
      ps=D.getElementById('parsed'),
      updateParsed=()=>ps.innerHTML=json(parse(tokenize(ed.innerText))),
      makeLineNumbers=c=>ln.innerHTML=[...Array([...c.matchAll('\n')].length+1).keys()
                                      ].map(x=>`<div><a class='nt-lf'href="line#${x+1}">${x+1}</a></div>`).join('')

function compile(k){
  let caret=getCaret(),
      {beg,end}=(caret&&caret.offsets) || {beg:0,end:0},
      cod=ed.innerText,
      tokens=tokenize(cod)
  ed.innerHTML=render(tokens)
  setCaret(beg,end)
  makeLineNumbers(cod)
  updateParsed()
  updateParsed() // extra call to 'fix' x-scrollbars
}

window.addEventListener('load', ()=>{
  ed.addEventListener('keydown', k=>{if(k.ctrlKey&&k.key=='Enter')compile()}, false)
  ed.spellcheck=false; //ed.focus();ed.blur(); // in case spellcheck still on
  ed.innerText=code
  ed.focus()
  compile()
}, false)
