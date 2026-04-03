const COLORS = ["blue", "white", "green", "black", "red"];
const TOKEN_TYPES = [...COLORS, "pearl", "gold"];
const SPIRAL = [
  [2,2],[2,3],[2,4],[3,4],[4,4],[4,3],[4,2],[4,1],[4,0],[3,0],[2,0],[1,0],[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[1,3],[1,2],[1,1],[2,1],[3,1],[3,2],[3,3]
];

const state = {
  board: Array.from({ length: 5 }, () => Array(5).fill(null)),
  bag: [],
  privileges: 3,
  players: [mkPlayer("玩家 A"), mkPlayer("玩家 B")],
  current: 0,
  firstPlayer: 0,
  pyramid: {1:[],2:[],3:[]},
  decks: {1:[],2:[],3:[]},
  royals: [],
  selection: { mode: null, cells: [], card: null, fromReserved: false, reserveDeck: null },
  optionalUsed: { privilege: false, refill: false },
  pendingDiscard: false,
  extraTurn: false,
  pendingEndExtra: false,
};

function mkPlayer(name){
  return {
    name,
    tokens: Object.fromEntries(TOKEN_TYPES.map(t=>[t,0])),
    reserved: [],
    cards: [],
    points: 0,
    crowns: 0,
    privileges: 0,
    bonuses: Object.fromEntries(COLORS.map(c=>[c,0]))
  };
}

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

function makeDeck(level, count){
  const deck=[];
  const abilityPool=[null, "extra", "mimic", "gainColor", "privilege", "steal"];
  for(let i=0;i<count;i++){
    const bonus = COLORS[Math.floor(Math.random()*COLORS.length)];
    const points = Math.random()<0.45 ? Math.ceil(level*Math.random()*2) : 0;
    const crowns = Math.random() < (level===3?0.45:0.22) ? 1 : 0;
    const ability = Math.random()<0.33 ? abilityPool[Math.floor(Math.random()*abilityPool.length)] : null;
    const cost = {};
    const slots = level+2;
    for(let k=0;k<slots;k++){
      const color = [...COLORS,"pearl"][Math.floor(Math.random()*(COLORS.length+1))];
      cost[color] = (cost[color]||0) + 1 + Math.floor(Math.random()*Math.max(1,level));
    }
    deck.push({ id:`L${level}-${i}-${Math.random().toString(36).slice(2,6)}`, level, points, crowns, ability, bonus, cost });
  }
  return shuffle(deck);
}

function init(){
  state.decks[1]=makeDeck(1,30); state.decks[2]=makeDeck(2,24); state.decks[3]=makeDeck(3,13);
  state.royals = shuffle([
    {id:"R1", points:2, ability:"privilege"},
    {id:"R2", points:1, ability:"gainColor", color:"blue"},
    {id:"R3", points:1, ability:"steal"},
    {id:"R4", points:2, ability:null}
  ]);

  for (const c of COLORS) for(let i=0;i<4;i++) state.bag.push(c);
  for(let i=0;i<2;i++) state.bag.push("pearl");
  for(let i=0;i<3;i++) state.bag.push("gold");
  shuffle(state.bag);

  for(const [r,c] of SPIRAL){ state.board[r][c]=state.bag.pop()||null; }

  for(let i=0;i<5;i++) state.pyramid[1].push(draw(1));
  for(let i=0;i<4;i++) state.pyramid[2].push(draw(2));
  for(let i=0;i<3;i++) state.pyramid[3].push(draw(3));

  state.firstPlayer = Math.floor(Math.random()*2);
  state.current = state.firstPlayer;
  state.players[1-state.firstPlayer].privileges = 1;

  bind();
  render();
}

function draw(level){ return state.decks[level].pop() || null; }
function cur(){ return state.players[state.current]; }
function opp(){ return state.players[1-state.current]; }

function bind(){
  document.getElementById("optionalPrivilegeBtn").onclick = usePrivilege;
  document.getElementById("optionalRefillBtn").onclick = optionalRefill;
  document.getElementById("takeTokensBtn").onclick = ()=>setMode("take");
  document.getElementById("reserveBtn").onclick = ()=>setMode("reserve");
  document.getElementById("buyBtn").onclick = ()=>setMode("buy");
  document.getElementById("confirmSelectionBtn").onclick = confirmSelection;
  document.getElementById("cancelSelectionBtn").onclick = clearSelection;
  document.getElementById("discardDoneBtn").onclick = finishDiscard;
  document.getElementById("nextPlayerBtn").onclick = ()=>{ document.getElementById("betweenTurns").close(); render(); };
}

function setMode(m){ state.selection.mode = m; state.selection.cells=[]; state.selection.card=null; state.selection.reserveDeck=null; render(); }
function clearSelection(){ state.selection.cells=[]; state.selection.card=null; state.selection.reserveDeck=null; render(); }

function usePrivilege(){
  if(state.optionalUsed.privilege || cur().privileges<1) return;
  setMode("usePrivilege");
  info("选择你要拿取的版图宝石（非金色），可一次拿多个，每拿 1 个消耗 1 卷轴。");
}
function optionalRefill(){
  if(state.optionalUsed.refill || state.bag.length===0) return;
  refillBoard();
  grantPrivilege(opp(),1);
  state.optionalUsed.refill = true;
  render();
}

function onCellClick(r,c){
  const t=state.board[r][c];
  const s=state.selection;
  if(!s.mode || !t) return;

  if(s.mode==="usePrivilege"){
    if(t==="gold") return info("使用卷轴不能拿金色 token。");
    const key=`${r},${c}`;
    if(s.cells.some(x=>x.key===key)){ s.cells=s.cells.filter(x=>x.key!==key); }
    else s.cells.push({r,c,key});
    render();
    return;
  }
  if(s.mode==="reserve"){
    if(t!=="gold") return info("预定行动必须先点选一个金色 token。");
    s.cells=[{r,c,key:`${r},${c}`}]; render(); return;
  }
  if(s.mode==="take"){
    if(t==="gold") return info("拿取 token 行动不能拿金色。");
    const key=`${r},${c}`;
    if(s.cells.some(x=>x.key===key)) s.cells=s.cells.filter(x=>x.key!==key);
    else if(s.cells.length<3) s.cells.push({r,c,key});
    render();
  }
}

function onCardClick(level, idx){
  const s=state.selection;
  if(s.mode==="reserve" || s.mode==="buy"){
    s.card={ level, idx, fromReserved:false };
    render();
  }
}
function onReserveCardClick(idx){
  if(state.selection.mode!=="buy") return;
  state.selection.card={ idx, fromReserved:true };
  render();
}
function onDeckClick(level){
  if(state.selection.mode!=="reserve") return;
  state.selection.reserveDeck = level;
  state.selection.card=null;
  render();
}

function confirmSelection(){
  const mode=state.selection.mode;
  if(mode==="usePrivilege") return doUsePrivilege();
  if(mode==="take") return doTakeTokens();
  if(mode==="reserve") return doReserve();
  if(mode==="buy") return doBuy();
}

function doUsePrivilege(){
  const picks=state.selection.cells;
  if(!picks.length) return info("请先选择版图 token。");
  if(cur().privileges < picks.length) return info("你的卷轴数量不足。");
  for(const p of picks){
    const t=state.board[p.r][p.c]; if(!t || t==="gold") continue;
    cur().tokens[t]++; state.board[p.r][p.c]=null;
  }
  cur().privileges -= picks.length;
  state.privileges += picks.length;
  state.optionalUsed.privilege = true;
  clearSelection();
  render();
}

function doTakeTokens(){
  const picks=state.selection.cells;
  if(!picks.length) return info("请选择 1~3 个 token。");
  if(!isLine(picks)) return info("必须在不间断的横/竖/斜直线上。");
  const types = picks.map(p=>state.board[p.r][p.c]);
  if(types.some(t=>!t || t==="gold")) return info("选择无效（不能含金色或空位）。");
  picks.forEach(p=>{ cur().tokens[state.board[p.r][p.c]]++; state.board[p.r][p.c]=null; });
  if((picks.length===3 && allSame(types)) || (picks.length===2 && types.every(t=>t==="pearl"))) grantPrivilege(opp(),1);
  endMandatory();
}

function doReserve(){
  if(cur().reserved.length>=3) return info("你已经有 3 张预定卡。");
  if(!state.selection.cells.length) return info("请先选 1 枚金色 token。");
  const {r,c}=state.selection.cells[0];
  if(state.board[r][c]!=="gold") return info("所选不是金色 token。");

  let card;
  if(state.selection.card && !state.selection.reserveDeck){
    const {level,idx}=state.selection.card;
    card = state.pyramid[level][idx];
    if(!card) return info("这张卡不存在。");
    state.pyramid[level][idx]=draw(level);
  }else if(state.selection.reserveDeck){
    card = draw(state.selection.reserveDeck);
    if(!card) return info("该牌库已空。");
  } else return info("请从金字塔选一张明牌，或点击某个牌库预定顶牌。");

  state.board[r][c]=null;
  cur().tokens.gold++;
  cur().reserved.push(card);
  endMandatory();
}

function doBuy(){
  if(!state.selection.card) return info("请选择要购买的卡（金字塔或自己的预定区）。");
  let card;
  if(state.selection.card.fromReserved){
    card = cur().reserved[state.selection.card.idx];
  } else {
    card = state.pyramid[state.selection.card.level][state.selection.card.idx];
  }
  if(!card) return info("卡不存在。");
  if(card.ability==="mimic" && totalBonuses(cur())===0) return info("没有已有 bonus，不能购买 mimic 卡。");

  const pay = computePay(card, cur());
  if(!pay.ok) return info("token 不足以购买该卡。");
  for(const [k,v] of Object.entries(pay.spend)){ cur().tokens[k]-=v; for(let i=0;i<v;i++) state.bag.push(k); }

  if(state.selection.card.fromReserved){
    cur().reserved.splice(state.selection.card.idx,1);
  } else {
    const {level,idx}=state.selection.card;
    state.pyramid[level][idx]=draw(level);
  }

  applyCard(cur(), card);
  resolveAbility(card, cur(), opp());
  checkCrowns(cur());
  endMandatory(card.ability==="extra");
}

function totalBonuses(p){ return Object.values(p.bonuses).reduce((a,b)=>a+b,0); }

function computePay(card, p){
  const need={...card.cost};
  for(const c of COLORS) need[c]=Math.max(0,(need[c]||0)-p.bonuses[c]);
  let gold=p.tokens.gold;
  const spend={};
  for(const t of [...COLORS,"pearl"]){
    const req=need[t]||0;
    const use=Math.min(req,p.tokens[t]);
    if(use) spend[t]=use;
    const rem=req-use;
    if(rem>gold) return {ok:false};
    if(rem>0){ spend.gold=(spend.gold||0)+rem; gold-=rem; }
  }
  return {ok:true,spend};
}

function applyCard(p, card){
  p.cards.push(card);
  p.points += card.points || 0;
  p.crowns += card.crowns || 0;
  if(card.ability==="mimic"){
    const maxColor = COLORS.reduce((best,c)=>p.bonuses[c]>p.bonuses[best]?c:best, COLORS[0]);
    p.bonuses[maxColor] += 1;
  } else p.bonuses[card.bonus] += 1;
}

function resolveAbility(card, me, enemy){
  switch(card.ability){
    case "gainColor": {
      const token = takeFromBoard(card.bonus);
      if(token) me.tokens[token]++;
      break;
    }
    case "privilege": grantPrivilege(me,1); break;
    case "steal": {
      const can=[...COLORS,"pearl"].filter(t=>enemy.tokens[t]>0);
      if(can.length){ const pick=can[Math.floor(Math.random()*can.length)]; enemy.tokens[pick]--; me.tokens[pick]++; }
      break;
    }
    default: break;
  }
}

function checkCrowns(p){
  if((p.crowns>=3 && !p.hit3) || (p.crowns>=6 && !p.hit6)){
    const r = state.royals.shift();
    if(r){ p.points += r.points; if(r.ability==="privilege") grantPrivilege(p,1); if(r.ability==="gainColor") { const t=takeFromBoard(r.color||"blue"); if(t) p.tokens[t]++; } }
    if(p.crowns>=3) p.hit3=true;
    if(p.crowns>=6) p.hit6=true;
  }
}

function takeFromBoard(color){
  for(const [r,c] of SPIRAL){ if(state.board[r][c]===color){ state.board[r][c]=null; return color; } }
  return null;
}

function endMandatory(extra=false){
  clearSelection();
  state.pendingEndExtra = extra;
  if (enforceTokenLimit()) {
    render();
    return;
  }
  resolvePostMandatory();
}

function resolvePostMandatory(){
  const extra = state.pendingEndExtra;
  state.pendingEndExtra = false;
  const winner = checkVictory(cur());
  if(winner){ render(); alert(`${cur().name} 获胜！条件：${winner}`); return; }
  if(extra){ state.extraTurn = true; render(); return; }
  state.extraTurn=false;
  state.current = 1-state.current;
  state.optionalUsed = { privilege:false, refill:false };
  const dlg=document.getElementById("betweenTurns");
  document.getElementById("betweenText").textContent = `请将屏幕交给 ${cur().name}`;
  dlg.showModal();
}

function enforceTokenLimit(){
  const p=cur();
  const total = tokenTotal(p);
  if(total<=10) return false;
  state.pendingDiscard = true;
  const dialog=document.getElementById("discardDialog");
  document.getElementById("discardInfo").textContent=`你有 ${total} 枚 token，需弃置到 10 枚。`;
  renderDiscardChoices();
  dialog.showModal();
  return true;
}

function renderDiscardChoices(){
  const p=cur();
  const total = tokenTotal(p);
  const remain = Math.max(0, total - 10);
  document.getElementById("discardChoices").innerHTML = TOKEN_TYPES.map(
    t=>`<button ${p.tokens[t]===0?"disabled":""} onclick="discardOne('${t}')">${labelToken(t)} (${p.tokens[t]})</button>`
  ).join("");
  const done = document.getElementById("discardDoneBtn");
  done.disabled = remain !== 0;
  done.textContent = remain === 0 ? "完成弃置" : `还需弃置 ${remain} 枚`;
}
function discardOne(t){
  const p = cur();
  if (!state.pendingDiscard || p.tokens[t] <= 0) return;
  p.tokens[t]--;
  state.bag.push(t);
  renderDiscardChoices();
  render();
}
function finishDiscard(){
  if (tokenTotal(cur()) > 10) return;
  document.getElementById("discardDialog").close();
  state.pendingDiscard=false;
  resolvePostMandatory();
}

function checkVictory(p){
  const mono = COLORS.some(c=>p.cards.filter(x=>(x.ability==="mimic"?bestColor(p):x.bonus)===c).reduce((s,x)=>s+(x.points||0),0)>=10);
  if(p.points>=20) return "总声望≥20";
  if(p.crowns>=10) return "王冠≥10";
  if(mono) return "同色声望≥10";
  return null;
}

function bestColor(p){ return COLORS.reduce((best,c)=>p.bonuses[c]>p.bonuses[best]?c:best, COLORS[0]); }
function tokenTotal(p){ return TOKEN_TYPES.reduce((s,t)=>s+p.tokens[t],0); }
function allSame(arr){ return arr.every(x=>x===arr[0]); }
function grantPrivilege(p,n){
  for(let i=0;i<n;i++){
    if(state.privileges>0){ state.privileges--; p.privileges++; }
  }
}

function isLine(picks){
  if(picks.length<=1) return true;
  const rows=picks.map(p=>p.r), cols=picks.map(p=>p.c);
  const sameR = rows.every(r=>r===rows[0]);
  const sameC = cols.every(c=>c===cols[0]);
  const diag = picks.every(p=>(p.r-p.c)===(rows[0]-cols[0])) || picks.every(p=>(p.r+p.c)===(rows[0]+cols[0]));
  if(!(sameR||sameC||diag)) return false;
  const sorted=[...picks].sort((a,b)=> (a.r===b.r? a.c-b.c : a.r-b.r));
  for(let i=1;i<sorted.length;i++){
    const dr=Math.abs(sorted[i].r-sorted[i-1].r), dc=Math.abs(sorted[i].c-sorted[i-1].c);
    if(dr>1||dc>1) return false;
  }
  return picks.every(p=>state.board[p.r][p.c]!=null);
}

function refillBoard(){
  shuffle(state.bag);
  for(const [r,c] of SPIRAL){
    if(state.board[r][c]==null && state.bag.length) state.board[r][c]=state.bag.pop();
  }
}

function info(msg){ document.getElementById("selectionInfo").textContent = msg; }

function render(){
  renderStatus(); renderBoard(); renderPyramid(); renderRoyals(); renderPlayers(); renderSelectionInfo();
}
function renderStatus(){
  const p=cur();
  document.getElementById("statusPanel").innerHTML = `<strong>当前回合：</strong>${p.name} ${state.extraTurn?"（额外行动回合）":""}<br>
  公共卷轴：${state.privileges} ｜ 袋中 token：${state.bag.length}`;
}
function renderBoard(){
  const el=document.getElementById("board");
  el.innerHTML="";
  for(let r=0;r<5;r++) for(let c=0;c<5;c++){
    const t=state.board[r][c];
    const d=document.createElement("div");
    d.className=`cell ${t?`token-${t}`:"empty"}`;
    d.textContent=t?labelToken(t):"·";
    if(state.selection.cells.some(x=>x.r===r&&x.c===c)) d.classList.add("selected");
    d.onclick=()=>onCellClick(r,c);
    el.appendChild(d);
  }
}
function renderPyramid(){
  const el=document.getElementById("pyramid");
  el.innerHTML="";
  [3,2,1].forEach(level=>{
    const row=document.createElement("div"); row.className="pyramid-level";
    const title=document.createElement("div"); title.textContent=`Lv${level} 牌库(${state.decks[level].length})`; title.className="small";
    title.onclick=()=>onDeckClick(level);
    row.appendChild(title);
    state.pyramid[level].forEach((card,idx)=> row.appendChild(renderCard(card,()=>onCardClick(level,idx), state.selection.card && !state.selection.card.fromReserved && state.selection.card.level===level && state.selection.card.idx===idx)));
    if(state.selection.reserveDeck===level){ const b=document.createElement("span"); b.className="pill gold"; b.textContent="已选牌库"; row.appendChild(b); }
    el.appendChild(row);
  });
}
function renderCard(card, cb, selected){
  const d=document.createElement("div"); d.className=`card ${selected?"selected":""}`; if(!card){ d.textContent="空"; return d; }
  const gemClass = `token-${card.ability==="mimic" ? "gold" : card.bonus}`;
  const levelBadge = "◆".repeat(Math.max(1, card.level));
  d.innerHTML=`<div class="top"><span>⭐${card.points||0}</span><span>👑${card.crowns||0}</span><span>${labelBonus(card)}</span></div>
  <div class="art">
    <div class="gem a ${gemClass}"></div>
    <div class="gem b ${gemClass}"></div>
  </div>
  <div class="ability">${abilityText(card.ability)} ｜ 阶级 ${levelBadge}</div>
  <div class="cost">${Object.entries(card.cost).map(([k,v])=>`<span class="pill ${k}">${costLabel(k)}×${v}</span>`).join("")}</div>`;
  d.onclick=cb; return d;
}
function labelBonus(card){ return card.ability==="mimic" ? "仿色" : `加成:${card.bonus}`; }
function abilityText(a){ return ({extra:"能力:再行动",mimic:"能力:仿色",gainColor:"能力:拿同色",privilege:"能力:+卷轴",steal:"能力:偷1"}[a]||"能力:无"); }
function costLabel(t){ return ({blue:"蓝",white:"白",green:"绿",black:"黑",red:"红",pearl:"珍珠",gold:"金"}[t]||t); }
function renderRoyals(){
  document.getElementById("royals").innerHTML = state.royals.map(r=>`<div class="royal">皇家卡 ${r.id}<br>⭐${r.points}<br>${abilityText(r.ability)}</div>`).join("");
}
function renderPlayers(){
  const box=document.getElementById("players");
  box.innerHTML = state.players.map((p,idx)=>`<div class="player ${idx===state.current?"active":""}">
    <h3>${p.name}</h3>
    <div class="small">分数:${p.points} ｜ 王冠:${p.crowns} ｜ 卷轴:${p.privileges}</div>
    <div class="small">Bonus: ${COLORS.map(c=>`${c}:${p.bonuses[c]}`).join(" ")}</div>
    <div class="small">Token: ${TOKEN_TYPES.map(t=>`${t}:${p.tokens[t]}`).join(" ")}</div>
    <div class="small">已购卡:${p.cards.length} ｜ 预定:${p.reserved.length}</div>
    <div>${idx===state.current ? p.reserved.map((c,i)=>`<button onclick="onReserveCardClick(${i})">预定#${i+1}</button>`).join("") : "<span class='small'>对手预定卡已隐藏</span>"}</div>
  </div>`).join("");
}
function renderSelectionInfo(){
  const s=state.selection;
  const txt = s.mode ? `当前模式：${s.mode} ｜ 选中格:${s.cells.length}${s.card?" ｜ 选中卡":""}${s.reserveDeck?` ｜ 选中牌库 Lv${s.reserveDeck}`:""}` : "请选择一种行动模式。";
  document.getElementById("selectionInfo").textContent = txt;
}
function labelToken(t){ return ({blue:"蓝",white:"白",green:"绿",black:"黑",red:"红",pearl:"珠",gold:"金"}[t]); }

window.onReserveCardClick = onReserveCardClick;
window.discardOne = discardOne;
init();
