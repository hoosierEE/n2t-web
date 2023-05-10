window.addEventListener('load', _=>{

  const P=document.getElementById('prototypes');
  P.innerHTML+='<div class="n2t_project heading">Project</div><div class="n2t_prototype heading">Prototype</div><div class="n2t_proto_comment heading">Description</div>';
  `01; And(a= ,b= ,out= );  And gate
01; And16(a= ,b= ,out= ); 16-bit And
01; DMux(in= ,sel= ,a= ,b= );  Channels the input to one out of two outputs
01; DMux4Way(in= ,sel= ,a= ,b= ,c= ,d= );  Channels the input to one out of four outputs
01; DMux8Way(in= ,sel= ,a= ,b= ,c= ,d= ,e= ,f= ,g= ,h= );  Channels the input to one out of eight outputs
01; Mux(a= ,b= ,sel= ,out= );  Selects between two inputs
01; Mux16(a= ,b= ,sel= ,out= );  Selects between two 16-bit inputs
01; Mux4Way16(a= ,b= ,c= ,d= ,sel= ,out= );  Selects between four 16-bit inputs
01; Mux8Way16(a= ,b= ,c= ,d= ,e= ,f= ,g= ,h= ,sel= ,out= );  Selects between eight 16-bit inputs
01; Nand(a= ,b= ,out= );  Nand gate (built-in)
01; Not(in= ,out= );  Not gate
01; Not16(in= ,out= );  16-bit Not
01; Or(a= ,b= ,out= );  Or gate
01; Or16(a= ,b= ,out= );  16-bit Or
01; Or8Way(in= ,out= );  8-way Or
01; Xor(a= ,b= ,out= );  Xor gate
02; ALU(x= ,y= ,zx= ,nx= ,zy= ,ny= ,f= ,no= ,out= ,zr= ,ng= );  Hack ALU
02; Add16(a= ,b= ,out= ); Adds up two 16-bit two's complement values
02; FullAdder(a= ,b= ,c= ,sum= ,carry= );  Adds up 3 bits
02; HalfAdder(a= ,b= ,sum= , carry= );  Adds up 2 bits
02; Inc16(in= ,out= );  Sets out to in + 1
03; Bit(in= ,load= ,out= ); 1-bit register
03; DFF(in= ,out= );  Data flip-flop gate (built-in)
03; PC(in= ,load= ,inc= ,reset= ,out= );  Program Counter
03; RAM16K(in= ,load= ,address= ,out= );  16K RAM
03; RAM4K(in= ,load= ,address= ,out= );  4K RAM
03; RAM512(in= ,load= ,address= ,out= );  512-word RAM
03; RAM64(in= ,load= ,address= ,out= );  64-word RAM
03; RAM8(in= ,load= ,address= ,out= );  8-word RAM
03; Register(in= ,load= ,out= );  16-bit register
05; ARegister(in= ,load= ,out= );  Address register (built-in)
05; CPU(inM= ,instruction= ,reset= ,outM= ,writeM= ,addressM= ,pc= );   Hack CPU
05; DRegister(in= ,load= ,out= );  Data register (built-in)
05; Keyboard(out= );  Keyboard memory map (built-in)
05; Memory(in= ,load= ,address= ,out= );  Data memory of the Hack platform (RAM)
05; ROM32K(address= ,out= );  Instruction memory of the Hack platform (built-in)
05; Screen(in= ,load= ,address= ,out= );  Screen memory map (built-in)
`.split('\n').filter(_=>_).forEach(x=>{
  let [j,p,c]=x.split(';')
  P.innerHTML+=`<div class="n2t_project">${j}</div><div class="n2t_prototype">${p};</div><div class="n2t_proto_comment">${c}</div>`;
})})
