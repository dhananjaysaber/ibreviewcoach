/** An editable annotated copy that opens in a new tab: report left, comment boxes in a right margin, pointer lines through the gutter. */
export type EditorComment = { label: string; text: string; quote?: string };
export type EditorRow = { kind: 'heading' | 'text' | 'table'; text: string; comments: EditorComment[] };
export type EditorInput = { rows: EditorRow[]; unplaced: EditorComment[] };

const CSS = String.raw`
@page{size:A4 portrait;margin:8mm 12mm}
*{box-sizing:border-box}
html{background:#E4E7EC}
body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
#bar{position:sticky;top:0;z-index:5;background:#0E1726;color:#fff;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 14px;font-size:13px}
#bar button{font:inherit;border:1px solid #5B6678;background:#1B2638;color:#fff;border-radius:6px;padding:6px 11px;cursor:pointer}
#bar button:hover{background:#2A3850}#bar button.pri{background:#FFE45C;color:#0E1726;border-color:#FFE45C;font-weight:700}
#bar .hint{margin-left:auto;color:#B8C0D0;font-size:12px}
.sheet{width:210mm;margin:14px auto;background:#fff;padding:0 12mm;box-shadow:0 1px 6px rgba(0,0,0,.18)}
table.pg{width:100%;border-collapse:collapse;table-layout:fixed}
.pg td{padding:0}
.hf{min-height:9mm;font:9pt Arial,sans-serif;color:#333;outline:none;padding:3mm 0 1mm}
.hf.off{color:transparent}
.hf.off::before{content:attr(data-ph);color:#A9B1C2;font:8pt Menlo,Consolas,monospace;border-bottom:1px dashed #C9CFDB}
.hf.on{border-bottom:0.5px solid #D0D4DC}
#ftr.on{border-bottom:0;border-top:0.5px solid #D0D4DC}
.row{display:grid;grid-template-columns:61% 39%;position:relative;break-inside:avoid;page-break-inside:avoid}
.txt{padding:2px 20px 2px 0;font-family:Georgia,'Times New Roman',serif}
.txt p{margin:0 0 6px;font-size:10.5pt;line-height:1.55;text-align:justify}
.txt h3{font:700 11.5pt Arial,sans-serif;margin:9px 0 2px}
.txt p.tab{font:7.5pt Menlo,Consolas,monospace;color:#5B6678;text-align:left}
mark{background:#FFE9A8;color:inherit;padding:0}
.cc{background:#F3F3F3;padding:2px 8px 2px 14px;display:flow-root}
.cb{background:#fff;border:0.5px solid #AFAFAF;border-radius:3px;padding:4px 7px;font:8.5pt/1.4 Arial,sans-serif;color:#222;position:relative}
.cb b{font:700 7.5pt Menlo,Consolas,monospace;color:#555}
.cb .tx{outline:none}.cb .tx:empty::before{content:'Type your comment';color:#9AA3B5}
.cb.cur{border-color:#2347F5;box-shadow:0 0 0 1px #2347F5}
.cb .x{position:absolute;top:1px;right:2px;border:0;background:none;color:#8A93A6;font-size:13px;line-height:1;cursor:pointer;padding:0 3px}
svg.ln{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible}
@media print{
 html{background:#fff}#bar{display:none}.sheet{margin:0;width:auto;padding:0;box-shadow:none}
 .hf.off::before{content:none}.hf.on{border:0}.cb .x{display:none}.cb.cur{border-color:#AFAFAF;box-shadow:none}
 thead{display:table-header-group}tfoot{display:table-footer-group}
}
`;

const JS = String.raw`
(function(){
var D=JSON.parse(document.getElementById('data').textContent);
var rowsEl=document.getElementById('rows'),cur=null,seq=0,SVGNS='http://www.w3.org/2000/svg';
function el(t,c){var e=document.createElement(t);if(c)e.className=c;return e;}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function simple(s){return s.replace(/[‘’]/g,"'").replace(/[“”]/g,'"').toLowerCase();}
function findQuote(text,q){
 if(!q)return null;var t=simple(text),k=simple(q).trim(),i=t.indexOf(k);
 if(i<0&&k.length>50){k=k.slice(0,50);i=t.indexOf(k);if(i>=0)return [i,Math.min(text.length,i+simple(q).length)];}
 return i<0?null:[i,i+k.length];
}
function makeBox(c,id){
 var b=el('div','cb');b.setAttribute('data-id',id);
 var x=el('button','x');x.textContent='×';x.title='Delete comment';x.setAttribute('contenteditable','false');
 var l=el('b');l.setAttribute('contenteditable','false');l.textContent='Commented ['+c.label+']:';
 var s=el('span','tx');s.setAttribute('contenteditable','true');s.textContent=c.text;
 b.appendChild(x);b.appendChild(l);b.appendChild(document.createTextNode(' '));b.appendChild(s);return b;
}
function build(){
 D.rows.forEach(function(r){
  var row=el('div','row'),t=el('div','txt'),cc=el('div','cc'),svg=document.createElementNS(SVGNS,'svg');svg.setAttribute('class','ln');
  if(r.kind==='heading'){var h=el('h3');h.textContent=r.text;t.appendChild(h);}
  else if(r.kind==='table'){var q=el('p','tab');q.textContent=r.text;t.appendChild(q);}
  else{
   var p=el('p'),ranges=[];
   r.comments.forEach(function(c,i){var f=findQuote(r.text,c.quote);if(f)ranges.push({s:f[0],e:f[1],i:i});});
   ranges.sort(function(a,b){return a.s-b.s;});
   var okR=[],end=0;ranges.forEach(function(g){if(g.s>=end){okR.push(g);end=g.e;}});
   var pos=0,html='';
   okR.forEach(function(g){html+=esc(r.text.slice(pos,g.s))+'<mark data-id="c'+(seq+g.i)+'">'+esc(r.text.slice(g.s,g.e))+'</mark>';pos=g.e;});
   p.innerHTML=html+esc(r.text.slice(pos));t.appendChild(p);
  }
  r.comments.forEach(function(c,i){cc.appendChild(makeBox(c,'c'+(seq+i)));});
  seq+=r.comments.length;
  row.appendChild(t);row.appendChild(cc);row.appendChild(svg);rowsEl.appendChild(row);
 });
 if(D.unplaced.length){
  var row=el('div','row'),t=el('div','txt'),cc=el('div','cc'),svg=document.createElementNS(SVGNS,'svg');svg.setAttribute('class','ln');
  t.innerHTML='<h3>Not placed on the report</h3><p class="tab">No quoted text in the report supports these strands, so there is nothing to point at.</p>';
  D.unplaced.forEach(function(c){cc.appendChild(makeBox(c,'c'+(seq++)));});
  row.appendChild(t);row.appendChild(cc);row.appendChild(svg);rowsEl.appendChild(row);
 }
 document.body.setAttribute('data-ready','1');
}
function targetOf(row,b){return row.querySelector('mark[data-id="'+b.getAttribute('data-id')+'"]')||null;}
function layout(){
 [].forEach.call(document.querySelectorAll('.row'),function(row){
  var cc=row.querySelector('.cc'),svg=row.querySelector('svg.ln'),txt=row.querySelector('.txt');
  var boxes=[].slice.call(cc.querySelectorAll('.cb'));
  boxes.forEach(function(b){b.style.marginTop='0px';});
  var ccTop=cc.getBoundingClientRect().top;
  var info=boxes.map(function(b){
   var m=targetOf(row,b),rs=m?m.getClientRects():[];
   return {b:b,top:rs.length?rs[0].top:1e9,bot:rs.length?rs[rs.length-1].bottom:0,has:rs.length>0};
  });
  info.sort(function(a,b){return a.top-b.top;});
  var cur2=[].slice.call(cc.querySelectorAll('.cb')),changed=info.some(function(i,k){return cur2[k]!==i.b;});
  if(changed){var ae=document.activeElement;info.forEach(function(i){cc.appendChild(i.b);});if(ae&&ae!==document.body&&ae.closest&&ae.closest('.cb')&&document.activeElement!==ae)ae.focus();}
  var used=0;
  info.forEach(function(i){
   var want=i.has?Math.max(0,((i.top+i.bot)/2-10)-ccTop):used;
   var mt=Math.max(want-used,used>0?4:0);i.b.style.marginTop=mt+'px';used+=mt+i.b.offsetHeight;
  });
  var rr=row.getBoundingClientRect(),tr=txt.getBoundingClientRect();
  while(svg.firstChild)svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox','0 0 '+rr.width+' '+rr.height);svg.setAttribute('preserveAspectRatio','none');
  var bx=tr.right-rr.left-10;
  info.forEach(function(i){
   if(!i.has)return;
   var br=i.b.getBoundingClientRect(),y0=i.top-rr.top+1,y1=i.bot-rr.top-1,ym=(y0+y1)/2,by=br.top-rr.top+10,bl=br.left-rr.left;
   var d='M'+(bx-4)+' '+y0+' L'+bx+' '+y0+' L'+bx+' '+y1+' L'+(bx-4)+' '+y1+' M'+bx+' '+ym+' L'+(bx+6)+' '+ym+' L'+(bl-8)+' '+by+' L'+bl+' '+by;
   var p=document.createElementNS(SVGNS,'path');p.setAttribute('d',d);p.setAttribute('fill','none');p.setAttribute('stroke','#B03A3A');p.setAttribute('stroke-width','0.8');svg.appendChild(p);
  });
 });
}
var raf=0;function later(){cancelAnimationFrame(raf);raf=requestAnimationFrame(layout);}
function removeBox(b){
 var id=b.getAttribute('data-id'),row=b.closest('.row'),m=row.querySelector('mark[data-id="'+id+'"]');
 if(m){var par=m.parentNode;while(m.firstChild)par.insertBefore(m.firstChild,m);par.removeChild(m);par.normalize();}
 if(cur===b)cur=null;b.parentNode.removeChild(b);layout();
}
function closestEl(n,sel){while(n&&n.nodeType!==1)n=n.parentNode;return n?n.closest(sel):null;}
function addComment(){
 var sel=window.getSelection();
 if(!sel.rangeCount||sel.isCollapsed){alert('Select some report text first, then press Add comment.');return;}
 var r=sel.getRangeAt(0),p1=closestEl(r.startContainer,'.txt p'),p2=closestEl(r.endContainer,'.txt p');
 if(!p1||p1!==p2||p1.classList.contains('tab')){alert('Select text inside one paragraph of the report.');return;}
 var id='n'+(Date.now()),m=document.createElement('mark');m.setAttribute('data-id',id);
 try{r.surroundContents(m);}catch(e){m.appendChild(r.extractContents());r.insertNode(m);}
 sel.removeAllRanges();
 var row=p1.closest('.row'),b=makeBox({label:'Teacher',text:''},id);row.querySelector('.cc').appendChild(b);layout();
 var s=b.querySelector('.tx');s.focus();
}
function toggleHF(id,btn,word){
 var h=document.getElementById(id),on=h.classList.contains('on');
 if(on){h.classList.remove('on');h.classList.add('off');h.textContent='';h.setAttribute('contenteditable','false');btn.textContent='Add '+word;}
 else{h.classList.remove('off');h.classList.add('on');h.setAttribute('contenteditable','true');btn.textContent='Remove '+word;h.focus();}
 layout();
}
function save(){
 [].forEach.call(document.querySelectorAll('.cb.cur'),function(b){b.classList.remove('cur');});
 [].forEach.call(document.querySelectorAll('svg.ln'),function(s){while(s.firstChild)s.removeChild(s.firstChild);});
 var html='<!doctype html>\n'+document.documentElement.outerHTML,a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download='Annotated-copy-edited.html';a.click();
 setTimeout(function(){URL.revokeObjectURL(a.href);},4000);layout();
}
function wire(){
 var bar=document.getElementById('bar');
 [].forEach.call(bar.querySelectorAll('button'),function(b){b.addEventListener('mousedown',function(e){e.preventDefault();});});
 document.getElementById('bAdd').onclick=addComment;
 document.getElementById('bDel').onclick=function(){if(!cur||!cur.parentNode){alert('Click inside the comment you want to delete first.');return;}removeBox(cur);};
 var bh=document.getElementById('bHdr'),bf=document.getElementById('bFtr');
 bh.onclick=function(){toggleHF('hdr',bh,'header');};bf.onclick=function(){toggleHF('ftr',bf,'footer');};
 document.getElementById('bSave').onclick=save;document.getElementById('bPrint').onclick=function(){layout();window.print();};
 document.addEventListener('focusin',function(e){var b=closestEl(e.target,'.cb');if(b){if(cur)cur.classList.remove('cur');cur=b;b.classList.add('cur');}});
 document.addEventListener('click',function(e){if(e.target.classList&&e.target.classList.contains('x')){removeBox(e.target.parentNode);}});
 document.addEventListener('input',later);window.addEventListener('resize',later);window.addEventListener('beforeprint',layout);
}
if(!document.body.getAttribute('data-ready'))build();
wire();layout();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(layout);
})();
`;

export function openAnnotatedEditor(input: EditorInput): boolean {
  const data = JSON.stringify(input).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>Annotated copy</title><style>' + CSS + '</style></head><body>' +
    '<div id="bar"><button class="pri" id="bAdd" type="button">Add comment</button><button id="bDel" type="button">Delete comment</button><button id="bHdr" type="button">Add header</button><button id="bFtr" type="button">Add footer</button><button id="bSave" type="button">Save edits</button><button class="pri" id="bPrint" type="button">Print / Save as PDF</button>' +
    '<span class="hint">Click any comment to edit it. To add one, select report text first.</span></div>' +
    '<div class="sheet"><table class="pg"><thead><tr><td><div class="hf off" id="hdr" data-ph="header space (empty)"></div></td></tr></thead><tfoot><tr><td><div class="hf off" id="ftr" data-ph="footer space (empty)"></div></td></tr></tfoot><tbody><tr><td><div id="rows"></div></td></tr></tbody></table></div>' +
    '<script type="application/json" id="data">' + data + '<' + '/script><script>' + JS + '<' + '/script></body></html>';
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open(); w.document.write(html); w.document.close();
  return true;
}
