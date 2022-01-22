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
const INDENT='  '
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
  const tokens=[]
  while(s){
    let r,t=0,m=s.length,err=0
    for(let [reg,typ] of PATTERNS) if((r=reg.exec(s))&&r.index<m) {t=[r[0],typ]; m=r.index}
    if(t) tokens.push(t)
    s=s.substr(m+(t?t[0].length:0))
  }
  return tokens
}

function cleanup(tokens){
  // block comments; [...x, line_num, col_num]
  let iscom=0,line=1,col=1,tx=[]
  for(let [x,typ] of tokens){
    if((iscom+=(cml==typ)-(cmr==typ))&&lin!=typ||cmr==typ) typ=cmt
    if(lin==typ){line++; col=0}
    tx.push([x,typ,line,col])
    col+=x.length
  }
  return tx
}

function parse(tokens){
  let i=0,errors=null
  const T=tokens.filter(x=>[cmt,lin,spc].every(y=>y!=x[1]))
  try{
    const peek=(typ,n=0)=>{if(i>=T.length)throw`expected ${typ}, got EOF`;return T[i+n][1]==typ}
    const eat=(typ,x=null)=>{if(peek(typ)&&(x&&x==T[i][0])||typ==T[i][1])return T[i++];throw`expected ${typ}, got ${T[i-1]}`}
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
      let size,begin, D={size:1, begin:0}
      if(side && peek(boo)){D.value=parseBool();return D}
      D.value=parseName()
      if(peek(sqL)){
        eat(sqL)
        D.begin=parseNum()
        if(peek(rng)){
          eat(rng)
          let upper=parseNum()
          if(D.begin>=upper) throw `In sub-bus [n..m], n should be < m, but got [${T[i-2]}..${T[i]}].`
          D.size=upper-D.begin+1
        }
        eat(sqR)
      }return D
    }

    const parseParams=()=>{
      let L=[parseSide()],R=[]
      eat(equ)
      R.push(parseSide(1))
      while(peek(com)){
        eat(com)
        L.push(parseSide())
        eat(equ)
        R.push(parseSide(1))
      }return zip(L,R)
    }

    const parsePart=()=>{
      let name=parseName()
      eat(paL)
      let params=parseParams()
      eat(paR)
      eat(sem)
      return{name,params}
    }

    const parseChip=()=>{
      eat(key,'CHIP')
      let d={name:parseName()}
      eat(cuL)
      eat(key,'IN');d.ins=parseIO();eat(sem)
      eat(key,'OUT');d.outs=parseIO();eat(sem)
      eat(key,'PARTS:');d.parts=[];while(!peek(cuR)){d.parts.push(parsePart())}
      eat(cuR)
      return d
    }

    return parseChip()
  }
  catch(ParseError){
    return ParseError // return T.slice(0,i)
  }
}

function render(tokens){
  let indent=0,s='',c=0,iserr=0
  for(let i in tokens){
    let [v,t]=tokens[i], tp=tokens[i-1]; tp=tp&&tp[1]
    let ind=INDENT.repeat(indent+=(t.endsWith('L'))-(t.endsWith('R'))).repeat('lin'==tp)
    let errClass=' nt-err'.repeat(iserr|=err==t)
    if([key,boo,num,cmt,nom].some(x=>t==x)) s+=`<span class="nt-${t}${errClass}">${ind+v}</span>`
    else s+=ind+v
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
Foo16(a=a, b[0..3]=x[2..3], out=n);
Nand(a=n, b=n, out=out);
}`

const D=document,
      ln=D.getElementById('linenum'),
      ed=D.getElementById('editor'),
      ps=D.getElementById('parsed'),
      allTokens=tokenize(code),
      cl=cleanup(allTokens)

ed.spellcheck=false; //ed.focus();ed.blur(); // in case spellcheck still on
// const starts=scan(allTokens, (x,y)=>x+y[0].length, 0); // array of start positions for tokens
ps.innerHTML=json(parse(cl))
ed.innerHTML=render(cl)
ln.innerHTML=[...Array([...code.matchAll('\n')].length+1).keys()
             ].map(x=>`<div><a class='lnum'href="line#${x+1}">${x+1}</a></div>`).join('')
