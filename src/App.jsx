import { useState, useRef, useEffect } from "react";
import logoffLogo from "./assets/logoff-logo.jpg";
import metamaskIcon from "./assets/metamask.svg";
import coinbaseIcon from "./assets/coinbase.svg";
import phantomIcon from "./assets/phantom.svg";
import bhHero from "./assets/bh-hero.jpg";

/* ══════════════════════════ CONFIG ══════════════════════════ */
const CFG = {
  recipientEVM: "0x8A8E725aa65BbcA51A895Dcaac14e3f592B3c8f2",
  recipientSOL: "3UPaXXsmdkb2JK8HEqP9NtVGbGi7iU7Lkfe1fBgXJW1Z",
  usdcBase: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  amount: 149,
  baseChainId: "0x2105",
  backendUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:8080",
  contactDM: "@LogoffAnon on X",
  contactEmail: "logoff@proton.me", // REPLACE
  refundDays: 7,
  devMode: typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"),
  devWallets: {
    evm: ["0x8A8E725aa65BbcA51A895Dcaac14e3f592B3c8f2"],
    solana: ["9BkQ1R427KpxdiFK3yX56fbL2v2erhf64PcDnbrFXSns"],
  },
};

/* ══════════════════════════ TRACKING ══════════════════════════ */
function track(event, meta = {}) {
  fetch(`${CFG.backendUrl}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, meta }),
  }).catch(() => {});
}

/* ══════════════════════════ WALLET SESSION ══════════════════════════ */
const WALLET_KEY = "logoff_wallet_session";
const isDevWallet = (addr, chain) => (CFG.devWallets[chain === "solana" ? "solana" : "evm"] || []).some(w => w.toLowerCase() === addr.toLowerCase());

function loadWalletSession() {
  try { const s = JSON.parse(localStorage.getItem(WALLET_KEY) || "null"); if (s?.addr) return s; } catch {} return null;
}
function saveWalletSession(chain, addr) {
  const isDev = isDevWallet(addr, chain);
  const s = { chain, addr, isDev, key: isDev ? "pk_dev_" + addr.slice(0, 8) : null };
  try { localStorage.setItem(WALLET_KEY, JSON.stringify(s)); } catch {} return s;
}
function clearWalletSession() { try { localStorage.removeItem(WALLET_KEY); } catch {} }

async function connectEvmWallet() {
  const p = window.ethereum;
  if (!p) throw new Error("No EVM wallet detected");
  try { await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CFG.baseChainId }] }); }
  catch (se) { if (se.code === 4902) await p.request({ method: "wallet_addEthereumChain", params: [{ chainId: CFG.baseChainId, chainName: "Base", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://mainnet.base.org"], blockExplorerUrls: ["https://basescan.org"] }] }); else throw se; }
  const accs = await p.request({ method: "eth_requestAccounts" });
  if (accs?.length) return accs[0];
  throw new Error("No accounts returned");
}

async function connectSolWallet() {
  const p = window.phantom?.solana || window.solana;
  if (!p?.isPhantom) throw new Error("Phantom not detected. Install from phantom.app");
  const r = await p.connect();
  return r.publicKey.toString();
}

/* ══════════════════════════ COMPONENTS ══════════════════════════ */

/* ══════════════════════════ HERO ORB ══════════════════════════ */
/*  mode: "image" (default) | "webm" | "rive" | "spline"        */
/*  To swap later: pass mode="webm" src="/hero.webm" etc.       */

const SHOOTING_STARS=[
  {d:4.5,dl:0,x:12,y:18,a:-32},{d:5.2,dl:2.8,x:78,y:10,a:-25},
  {d:6,dl:5.5,x:55,y:8,a:-38},{d:4.8,dl:8,x:30,y:14,a:-28},
];

function HeroOrb({mode="image"}){
  /* ── image variant (default) ── */
  if(mode==="image") return(
    <div className="ho">
      {/* ambient glow — behind image */}
      <div className="ho-glow"/>
      {/* the brand image — masked to soft circle */}
      <div className="ho-img-wrap">
        <img src={bhHero} alt="" className="ho-img" draggable={false}/>
        {/* shimmer: rotating conic highlight over the accretion disk */}
        <div className="ho-shimmer"/>
      </div>
      {/* outer halo */}
      <div className="ho-halo"/>
      {/* dust particles orbiting slowly */}
      <div className="ho-dust">
        {[0,1,2,3,4,5].map(i=><span key={i} className="ho-dot" style={{animationDelay:`${-i*3.5}s`}}/>)}
      </div>
    </div>
  );

  /* ── webm variant (video loop) ── */
  if(mode==="webm") return(
    <div className="ho">
      <div className="ho-glow"/>
      <div className="ho-img-wrap">
        <video className="ho-img" autoPlay loop muted playsInline><source src="/hero.webm" type="video/webm"/></video>
      </div>
      <div className="ho-halo"/>
    </div>
  );

  /* ── rive / spline placeholder ── */
  return(
    <div className="ho">
      <div className="ho-glow"/>
      <div className="ho-img-wrap" id="hero-embed">
        {/* mount Rive canvas or Spline viewer here */}
        <img src={bhHero} alt="" className="ho-img" draggable={false}/>
      </div>
      <div className="ho-halo"/>
    </div>
  );
}

function FaqItem({item}){const[o,setO]=useState(false);return(<div className="faq-i"><button className="faq-q" onClick={()=>setO(!o)}>{item.q}<span className={`faq-ar ${o?"o":""}`}>{"\u25be"}</span></button>{o&&<div className="faq-a">{item.a}</div>}</div>)}

function detectWallets(){return{hasMetaMask:!!window.ethereum?.isMetaMask,hasCoinbase:!!(window.ethereum?.isCoinbaseWallet||window.coinbaseWalletExtension),hasEVM:!!window.ethereum,hasPhantom:!!(window.phantom?.solana?.isPhantom||window.solana?.isPhantom)}}
const trunc=a=>a?a.slice(0,6)+"..."+a.slice(-4):"";

/* ══════════════════════════ WIDGET DEMO ══════════════════════════ */

function renderMsg(text){
  const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
  const bullets=[];const before=[];const after=[];
  let pastBullets=false;
  for(const l of lines){
    if(l.startsWith("- ")){bullets.push(l.slice(2));pastBullets=true}
    else if(!pastBullets){before.push(l)}
    else{after.push(l)}
  }
  return(<>
    {before.map((l,i)=><div key={"p"+i} className="wm-p">{l}</div>)}
    {bullets.length>0&&<ul className="wm-ul">{bullets.map((b,i)=><li key={"b"+i} className="wm-li">{b}</li>)}</ul>}
    {after.map((l,i)=><div key={"q"+i} className="wm-q">{l}</div>)}
  </>);
}

const WIDGET_STORAGE_KEY="logoff_widget_chat";
const INITIAL_MSG={from:"bot",text:"Hey! I'm LOGOFF, an AI customer ops agent. Try asking me something \u2014 like a support question or a pricing inquiry."};

function loadWidgetChat(){
  try{const d=JSON.parse(localStorage.getItem(WIDGET_STORAGE_KEY));if(d?.convId&&d?.msgs?.length)return d;}catch{}
  return null;
}
function saveWidgetChat(convId,msgs){
  try{localStorage.setItem(WIDGET_STORAGE_KEY,JSON.stringify({convId,msgs}));}catch{}
}

function WidgetDemo(){
  const[open,setOpen]=useState(false);
  const[msgs,setMsgs]=useState(()=>{const saved=loadWidgetChat();return saved?saved.msgs:[INITIAL_MSG];});
  const[inp,setInp]=useState("");
  const[convId,setConvId]=useState(()=>{const saved=loadWidgetChat();return saved?saved.convId:"demo-"+Date.now().toString(36);});
  const[loading,setLoading]=useState(false);
  const[lift,setLift]=useState(0);

  // Persist to localStorage whenever msgs or convId change
  useEffect(()=>{saveWidgetChat(convId,msgs);},[convId,msgs]);

  // Keep widget above footer
  useEffect(()=>{
    const foot=document.querySelector(".foot");
    if(!foot)return;
    const check=()=>{
      const fr=foot.getBoundingClientRect();
      const vp=window.innerHeight;
      const btnBottom=32; // CSS bottom offset of .widget-demo
      const btnH=80; // button height + margin
      const overlap=vp-fr.top;
      setLift(overlap>-btnBottom?Math.max(0,overlap+btnBottom+8):0);
    };
    check();
    window.addEventListener("scroll",check,{passive:true});
    window.addEventListener("resize",check,{passive:true});
    return()=>{window.removeEventListener("scroll",check);window.removeEventListener("resize",check)};
  },[]);

  const resetChat=()=>{
    const newId="demo-"+Date.now().toString(36);
    setConvId(newId);
    setMsgs([INITIAL_MSG]);
    setInp("");
  };

  const send=async()=>{
    if(!inp.trim()||loading)return;
    const userMsg=inp;setInp("");
    setMsgs(p=>[...p,{from:"usr",text:userMsg}]);
    setLoading(true);
    try{
      const res=await fetch(`${CFG.backendUrl}/demo/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMsg,conversationId:convId})});
      if(res.ok){const data=await res.json();setMsgs(p=>[...p,{from:"bot",text:data.reply||"Got it. Let me look into that."}]);setLoading(false);return}
    }catch{}
    setMsgs(p=>[...p,{from:"bot",text:"Demo backend offline. Try again shortly."}]);setLoading(false);
  };
  return(
    <div className="widget-demo" style={lift?{transform:`translateY(-${lift}px)`}:undefined}>
      {open&&<div className="widget-panel">
        <div className="widget-head">
          <img src={logoffLogo} alt="LOGOFF" className="wh-avatar"/>
          <div style={{flex:1}}><div className="wh-name">LOGOFF</div><div className="wh-sub">AI Customer Ops</div></div>
          <button className="widget-new" onClick={resetChat} title="New chat">New</button>
          <button className="widget-close" onClick={()=>setOpen(false)}>{"\u2715"}</button>
        </div>
        <div className="widget-notice">Demo {"\u2014"} limited. Production requires early access activation.</div>
        <div className="widget-msgs">{msgs.map((m,i)=><div key={i} className={`widget-m ${m.from==="bot"?"bot":"usr"}`}>{m.from==="bot"?renderMsg(m.text):m.text}</div>)}{loading&&<div className="widget-m bot" style={{opacity:.5}}>Typing...</div>}</div>
        <div className="widget-input"><input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask something..."/><button onClick={send}>{"\u2192"}</button></div>
      </div>}
      <button className="widget-btn" onClick={()=>setOpen(!open)}>
        {open
          ? <span style={{fontSize:16,lineHeight:1}}>{"\u2715"}</span>
          : <img src={logoffLogo} alt="Chat" className="widget-btn-logo"/>
        }
      </button>
    </div>
  );
}

/* ══════════════════════════ PURCHASE ══════════════════════════ */

function PurchaseBox({wallet, onOpenLogin, onEarlyAccess}){
  const[payChain,setPayChain]=useState("base");
  const[ws,setWs]=useState("idle"); // idle | paying | done
  const[err,setErr]=useState("");
  const[txHash,setTxHash]=useState(null);
  const[paidChain,setPaidChain]=useState(null);

  const isConnected=!!wallet?.addr;
  // "base" needs EVM wallet, "solana" needs solana wallet
  const chainMatch=isConnected&&((payChain==="base"&&wallet.chain!=="solana")||(payChain==="solana"&&wallet.chain==="solana"));

  const reset=()=>{setWs("idle");setErr("");setTxHash(null)};

  // ── Base USDC pay ──
  const payBase=async()=>{
    setWs("paying");setErr("");
    try{
      const p=window.ethereum;
      const amtHex="0x"+(BigInt(CFG.amount)*BigInt(1e6)).toString(16);
      const sig="0xa9059cbb";
      const data=sig+CFG.recipientEVM.slice(2).padStart(64,"0")+amtHex.slice(2).padStart(64,"0");
      const hash=await p.request({method:"eth_sendTransaction",params:[{from:wallet.addr,to:CFG.usdcBase,data,value:"0x0"}]});
      setTxHash(hash);setPaidChain("Base");setWs("done");
    }catch(e){setErr(e?.message||"Transaction failed.");setWs("idle")}
  };

  // ── Solana SPL USDC pay via Phantom ──
  const paySolana=async()=>{
    setWs("paying");setErr("");
    try{
      const provider=window.phantom?.solana||window.solana;
      if(!provider)throw new Error("Phantom not found");

      if(!window.solanaWeb3){
        await new Promise((resolve,reject)=>{
          const s=document.createElement("script");
          s.src="https://unpkg.com/@solana/web3.js@1.98.0/lib/index.iife.min.js";
          s.onload=resolve;s.onerror=()=>reject(new Error("Failed to load Solana library"));
          document.head.appendChild(s);
        });
      }
      const{Connection,PublicKey,Transaction,TransactionInstruction,SystemProgram}=window.solanaWeb3;

      const connection=new Connection("https://api.mainnet-beta.solana.com","confirmed");
      const fromPubkey=new PublicKey(wallet.addr);
      const toPubkey=new PublicKey(CFG.recipientSOL);
      const usdcMint=new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
      const TOKEN_PROGRAM=new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      const ATA_PROGRAM=new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
      const RENT=new PublicKey("SysvarRent111111111111111111111111111111111");

      const[fromATA]=PublicKey.findProgramAddressSync([fromPubkey.toBuffer(),TOKEN_PROGRAM.toBuffer(),usdcMint.toBuffer()],ATA_PROGRAM);
      const[toATA]=PublicKey.findProgramAddressSync([toPubkey.toBuffer(),TOKEN_PROGRAM.toBuffer(),usdcMint.toBuffer()],ATA_PROGRAM);

      const amountRaw=BigInt(CFG.amount)*BigInt(1e6);
      const dataArr=new Uint8Array(1+8+1);
      dataArr[0]=12;
      new DataView(dataArr.buffer).setBigUint64(1,amountRaw,true);
      dataArr[9]=6;

      const transferIx=new TransactionInstruction({
        keys:[
          {pubkey:fromATA,isSigner:false,isWritable:true},
          {pubkey:usdcMint,isSigner:false,isWritable:false},
          {pubkey:toATA,isSigner:false,isWritable:true},
          {pubkey:fromPubkey,isSigner:true,isWritable:false},
        ],
        programId:TOKEN_PROGRAM,
        data:dataArr,
      });

      const tx=new Transaction();
      const toATAInfo=await connection.getAccountInfo(toATA);
      if(!toATAInfo){
        tx.add(new TransactionInstruction({
          keys:[
            {pubkey:fromPubkey,isSigner:true,isWritable:true},
            {pubkey:toATA,isSigner:false,isWritable:true},
            {pubkey:toPubkey,isSigner:false,isWritable:false},
            {pubkey:usdcMint,isSigner:false,isWritable:false},
            {pubkey:SystemProgram.programId,isSigner:false,isWritable:false},
            {pubkey:TOKEN_PROGRAM,isSigner:false,isWritable:false},
            {pubkey:RENT,isSigner:false,isWritable:false},
          ],
          programId:ATA_PROGRAM,
          data:new Uint8Array(0),
        }));
      }

      tx.add(transferIx);
      tx.feePayer=fromPubkey;
      const{blockhash}=await connection.getLatestBlockhash();
      tx.recentBlockhash=blockhash;

      const{signature}=await provider.signAndSendTransaction(tx);
      await connection.confirmTransaction(signature,"confirmed");

      setTxHash(signature);setPaidChain("Solana");setWs("done");
    }catch(e){
      setErr("Solana payment temporarily unavailable \u2014 use Base for now.");
      setWs("idle");
    }
  };

  // ── Post-payment confirmation ──
  if(ws==="done")return(
    <div className="pbox">
      <div style={{fontSize:48,textAlign:"center",marginBottom:16}}>{"\u2728"}</div>
      <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:"var(--cream)",textAlign:"center",marginBottom:16}}>{"You're in early access."}</h3>
      <p style={{fontSize:14,color:"var(--dim)",textAlign:"center",lineHeight:1.7,marginBottom:20}}>Payment sent on {paidChain||"chain"}. Manual activation within 24 hours.</p>
      <div className="confirm-box">
        <h4>To confirm activation</h4>
        {txHash&&<><p style={{marginTop:8}}>Your transaction:</p><div className="tx-hash">{txHash}</div></>}
        <p>Send your tx hash to us:</p>
        <div className="contact-line">{"\ud83d\udce9"} DM <strong style={{color:"var(--gold)",marginLeft:4}}>{CFG.contactDM}</strong></div>
        <div className="contact-line">{"\ud83d\udce7"} Email <strong style={{color:"var(--gold)",marginLeft:4}}>{CFG.contactEmail}</strong></div>
        <p style={{marginTop:16,fontSize:12,color:"var(--mute)"}}>We manually onboard each customer during early access. {CFG.refundDays}-day full refund if we cannot activate for your stack.</p>
      </div>
      <button className="bgh" style={{width:"100%",marginTop:20,padding:12}} onClick={onEarlyAccess}>{"What you'll get after activation \u2192"}</button>
    </div>
  );

  // ── Determine pay button state ──
  const handlePay=()=>{
    track("pay_click",{chain:payChain});
    if(payChain==="base") payBase();
    else paySolana();
  };

  const chainLabel=payChain==="base"?"Base":"Solana";
  const walletChainLabel=wallet?.chain==="solana"?"Solana":"Base";

  // ── Main purchase UI ──
  return(
    <div className="pbox">
      <div className="ea-badge">Early Access</div>
      <div className="pprice">$149<sup style={{fontSize:15,color:"var(--dim)"}}> / 30 days</sup></div>
      <div className="pcur">USDC {"\u00b7"} Activates 30 days {"\u00b7"} Renew manually {"\u00b7"} We remind you</div>

      <div className="chain-tabs">
        <button className={`chain-tab ${payChain==="base"?"active":""}`} onClick={()=>{setPayChain("base");reset()}}>{"\ud83d\udd35"} Base<div className="ct-sub">USDC on Base</div></button>
        <button className={`chain-tab ${payChain==="solana"?"active":""}`} onClick={()=>{setPayChain("solana");reset()}}>{"\ud83d\udfe3"} Solana<div className="ct-sub">USDC via Phantom</div></button>
      </div>

      <div className="pinc">
        <p><span>{"\u2192"}</span>Payment reserves your early access spot</p>
        <p><span>{"\u2192"}</span>Manual onboarding after confirmation</p>
        <p><span>{"\u2192"}</span>Full refund if not activated within {CFG.refundDays} days</p>
        <p><span>{"\u2192"}</span>Priority access to new features</p>
      </div>

      {/* Connected badge */}
      {isConnected&&<div className="wcon"><span className="dt"/><span>{trunc(wallet.addr)}</span><span className="cb2">{walletChainLabel}</span></div>}

      {/* Pay button logic */}
      {!isConnected&&(
        <button className="wbtn" onClick={onOpenLogin}>Connect wallet to pay {"\u2192"}</button>
      )}
      {isConnected&&chainMatch&&ws==="idle"&&(
        <button className="wbtn" onClick={handlePay}>Pay $149 USDC (30 days) {"\u2192"}</button>
      )}
      {isConnected&&!chainMatch&&ws==="idle"&&(
        <button className="wbtn" onClick={onOpenLogin}>Switch to {chainLabel} wallet {"\u2192"}</button>
      )}
      {ws==="paying"&&<button className="wbtn" disabled><div className="spn"/> Sending on {chainLabel}...</button>}

      {err&&<div className="werr">{err}</div>}
      <p className="wnote">Activates 30 days {"\u00b7"} Renew manually (we send reminders) {"\u00b7"} {CFG.refundDays}-day refund guarantee</p>
    </div>
  );
}

/* ══════════════════════════ EARLY ACCESS PAGE ══════════════════════════ */

function EarlyAccessPage({goBuy}){
  return(<div className="ea-page">
    <div className="ea-badge" style={{marginBottom:24}}>Early Access</div>
    <h1>Under Development</h1>
    <p className="ea-sub">LOGOFF is in early access. Payment reserves your spot. We manually onboard each customer to ensure quality.</p>
    <div className="ea-roadmap">
      <div className="ea-item"><span className="ea-dot"/>Install widget + public client key</div>
      <div className="ea-item"><span className="ea-dot"/>Connect knowledge base (Notion, Confluence, GitBook)</div>
      <div className="ea-item"><span className="ea-dot"/>Slack escalation packets</div>
      <div className="ea-item"><span className="ea-dot"/>Conversation dashboard + KPIs</div>
      <div className="ea-item"><span className="ea-dot"/>Self-serve onboarding</div>
    </div>
    <button className="bg" onClick={goBuy}>{"Join Early Access \u2192"}</button>
  </div>);
}

/* ══════════════════════════ DEV PREVIEW PAGE ══════════════════════════ */

function DevPreviewPage({devSession, onDisconnect}){
  const fakeKey = devSession?.key || "pk_dev_preview";
  const snippet = `<script\n  src="https://logoff.ai/widget.js"\n  data-client-key="${fakeKey}"\n  data-theme="dark"\n  async>\n</script>`;
  const snippetCopy = `<script src="https://logoff.ai/widget.js" data-client-key="${fakeKey}" data-theme="dark" async></script>`;

  return(<div className="preview">
    <div className="preview-badge">{"\ud83d\udd12"} Dev Preview {"\u00b7"} {trunc(devSession?.addr || "")}</div>
    <h1>Preview Mode</h1>
    <p style={{fontSize:15,color:"var(--dim)",lineHeight:1.7,marginBottom:8}}>This is a dev-only preview of the post-activation experience. Real customers will be manually onboarded during early access.</p>
    <p style={{fontSize:13,color:"var(--mute)",marginBottom:0}}>All features below are placeholders. No real data or connections.</p>

    <div className="preview-grid">
      <div className="preview-card">
        <span className="pc-tag">under dev</span>
        <h3>Install Widget</h3>
        <p>Your widget snippet with client key:</p>
        <div className="preview-snippet">{snippet}</div>
        <button className="preview-copy" onClick={()=>{try{navigator.clipboard.writeText(snippetCopy)}catch(e){}}}>Copy snippet</button>
      </div>

      <div className="preview-card">
        <span className="pc-tag">under dev</span>
        <h3>Knowledge Base</h3>
        <p>Connect Notion, Confluence, GitBook, or upload markdown. LOGOFF will answer from your source of truth.</p>
        <div style={{marginTop:16,padding:"12px 16px",background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:8,fontSize:13,color:"var(--mute)",textAlign:"center"}}>KB connection coming soon</div>
      </div>

      <div className="preview-card">
        <span className="pc-tag">under dev</span>
        <h3>Slack Escalations</h3>
        <p>When LOGOFF escalates, handoff packets go directly to your Slack channel with full context.</p>
        <div style={{marginTop:16,padding:"12px 16px",background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:8,fontSize:13,color:"var(--mute)",textAlign:"center"}}>Slack integration coming soon</div>
      </div>

      <div className="preview-card">
        <span className="pc-tag">under dev</span>
        <h3>Dashboard + KPIs</h3>
        <p>Conversations list, response times, escalation rate, leads qualified, revenue attribution.</p>
        <div style={{marginTop:16,padding:"12px 16px",background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:8,fontSize:13,color:"var(--mute)",textAlign:"center"}}>Dashboard coming soon</div>
      </div>
    </div>

    <button className="preview-disconnect" onClick={onDisconnect}>Disconnect dev wallet</button>
  </div>);
}

/* ══════════════════════════ LANDING ══════════════════════════ */

/* inline SVG icons — consistent stroke set, gold, 24x24 */
const ICO={
  support:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2z"/><path d="M18 16v-5a6 6 0 0 0-12 0v5"/><path d="M4 16h2a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1z"/><path d="M20 16h-2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1z"/></svg>,
  target:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>,
  route:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H12"/></svg>,
  chart:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 5-9"/></svg>,
};

const CAPS=[
  {icon:ICO.support,title:"Customer Support",desc:"Triage every inbound ticket. KB-driven answers. SLA-aware prioritization. When LOGOFF cannot resolve, it escalates with a complete handoff packet \u2014 summary, sentiment, timeline, and a paste-ready recommended reply.",metric:"Heartbeat-ready"},
  {icon:ICO.target,title:"Sales Qualification",desc:"Detects high-intent signals: pricing page visits, integration questions, deadline mentions. Qualifies leads, handles objections, and books demos through your calendar.",metric:"Continuous"},
  {icon:ICO.route,title:"User Onboarding",desc:"Guides new signups through checklist-driven milestone funnels. Identifies stuck points and triggers micro-guidance. Detects churn risk signals early.",metric:"First-value fast"},
  {icon:ICO.chart,title:"Ops Intelligence",desc:"Daily summaries with concrete KPIs: conversations handled, response times, lead conversions, revenue attribution. Weekly reviews with top objections and KB gaps.",metric:"Daily + weekly"},
];

const FAQS=[
  {q:"What does LOGOFF actually do?",a:"LOGOFF is an AI agent that runs your customer operations: support tickets, sales qualification, user onboarding, and KPI reporting \u2014 all autonomously."},
  {q:"How does it connect to my tools?",a:"Integrates with Zendesk, Intercom, Freshdesk, HubSpot, Pipedrive, Salesforce, Google Calendar, Calendly, Notion, Confluence, GitBook, and Slack."},
  {q:"What happens when it cannot handle something?",a:"LOGOFF escalates cleanly with a handoff packet: summary, customer sentiment, facts/timeline, paste-ready recommended reply, and next internal action."},
  {q:"Is my customer data safe?",a:"Privacy-first. LOGOFF never stores personal data in its memory. Uses ticket IDs only. Customer records live in your CRM."},
  {q:"How does early access work?",a:`Pay $149 USDC on Base or Solana via wallet connect. DM or email your tx hash. We manually onboard within 24 hours. ${CFG.refundDays}-day refund if we cannot activate for your stack.`},
  {q:"How long until LOGOFF is active?",a:"After payment confirmation and manual onboarding, typically within 24-48 hours. Self-serve onboarding is coming soon."},
  {q:"What if I need custom workflows?",a:"Early access includes personal onboarding support. For enterprise needs, reach out via @LogoffAnon on X."},
];

function Landing({nav, wallet, onOpenLogin}){
  const buyRef=useRef(null);
  const go=id=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
  const goBuy=()=>buyRef.current?.scrollIntoView({behavior:"smooth"});
  return(<>
    <section className="hero">
      {/* shooting stars — subtle background streaks */}
      {SHOOTING_STARS.map((s,i)=><div key={i} className="hero-star" style={{left:`${s.x}%`,top:`${s.y}%`,animationDuration:`${s.d}s`,animationDelay:`${s.dl}s`,transform:`rotate(${s.a}deg)`}}/>)}
      <div className="h-label"><span className="p"/>Early Access Open</div>
      <HeroOrb/>
      <h1>Your customer ops,<br/><em>handled.</em></h1>
      <p className="h-sub">LOGOFF is an AI agent that runs your support, qualifies your leads, and onboards your users. 24/7. No hiring. No training.</p>
      <p className="h-tag">Early access {"\u00b7"} $149 / 30 days USDC {"\u00b7"} Base + Solana {"\u00b7"} Automated by <a href="https://x.com/LogSocrates" target="_blank" rel="noopener noreferrer" className="x-link">@LogSocrates</a></p>
      <div className="h-acts"><button className="bg" onClick={goBuy}>{"Join Early Access \u2014 $149"}</button><button className="bgh" onClick={()=>go("what")}>{"See how it works"}</button></div>
      <div className="proof">
        <div><div className="pv">24/7</div><div className="pl">Availability</div></div>
        <div><div className="pv">12+</div><div className="pl">Integrations</div></div>
        <div><div className="pv">$149</div><div className="pl">Per 30 days</div></div>
        <div><div className="pv">{CFG.refundDays}d</div><div className="pl">Refund guarantee</div></div>
      </div>
    </section>

    <section className="sec-a"><div className="sec"><div style={{textAlign:"center",marginBottom:48}}><div className="sl">The Math</div><div className="st">A support hire costs $4,000+/mo</div><p style={{fontSize:16,color:"var(--dim)",maxWidth:500,margin:"0 auto",lineHeight:1.7}}>They work 8 hours, need training, take vacations. LOGOFF never sleeps.</p></div>
      <div className="compare"><div className="comp-col"><div className="comp-h">Human Agent</div><div className="cr"><span className="x">{"\u2717"}</span>$4,000+/month salary</div><div className="cr"><span className="x">{"\u2717"}</span>8 hours/day</div><div className="cr"><span className="x">{"\u2717"}</span>Weeks of onboarding</div><div className="cr"><span className="x">{"\u2717"}</span>One language</div><div className="cr"><span className="x">{"\u2717"}</span>Needs scripts + supervision</div><div className="cr"><span className="x">{"\u2717"}</span>Inconsistent escalations</div></div>
        <div className="comp-vs">vs</div>
        <div className="comp-col gc"><div className="comp-h gh">LOGOFF</div><div className="cr"><span className="ck">{"\u2713"}</span>$149 / 30 days</div><div className="cr"><span className="ck">{"\u2713"}</span>24/7 availability</div><div className="cr"><span className="ck">{"\u2713"}</span>Activation after onboarding</div><div className="cr"><span className="ck">{"\u2713"}</span>Multi-language ready</div><div className="cr"><span className="ck">{"\u2713"}</span>KB-driven answers</div><div className="cr"><span className="ck">{"\u2713"}</span>Structured handoff packets</div></div>
      </div></div></section>
    <div className="div"/>

    <section className="sec" id="what"><div className="sl">What LOGOFF Does</div><div className="st">Support. Sales. Onboarding. Intelligence.</div><div className="sd">Not a chatbot widget. An ops agent with a daily rhythm, KPI tracking, and contextual escalation.</div><div className="caps">{CAPS.map((c,i)=><div key={i} className="cap"><div className="cap-i">{c.icon}</div><div className="cap-t">{c.title}</div><div className="cap-d">{c.desc}</div><div className="cap-m">{c.metric}</div></div>)}</div></section>
    <div className="div"/>

    <section className="sec-a"><div className="sec" id="demo"><div className="sl">Live Example</div><div className="st">See LOGOFF in action</div><div className="sd">A real support ticket and the escalation handoff it produces.</div>
      <div className="demo-wrap">
        <div className="demo-card"><div className="demo-label">Customer Conversation</div>
          <div className="demo-msg user">Hi, I was charged twice for my Pro plan. Order #4521.</div>
          <div className="demo-msg agent"><strong>LOGOFF:</strong> I see the duplicate charge on #4521. This is a billing issue requiring manual review. Escalating with full context now.</div>
          <div className="demo-msg agent"><strong>LOGOFF:</strong> {"You'll hear back within 2 hours. Flagged as high priority. Anything else?"}</div>
          <div className="demo-msg user">No, thanks for the fast response.</div>
        </div>
        <div className="demo-card"><div className="demo-label">Escalation Handoff Packet</div>
          <div className="handoff">
            <div><span className="hl">ESCALATION</span> <span className="hv">#4521</span></div><br/>
            <div><span className="hl">Summary:</span> <span className="hv">Duplicate charge on Pro plan. Customer wants refund.</span></div><br/>
            <div><span className="hl">Sentiment:</span> <span className="hv">Medium (calm but firm)</span></div><br/>
            <div><span className="hl">Facts:</span> <span className="hv">Two charges of $149 on Feb 28.</span></div><br/>
            <div><span className="hl">Recommended reply:</span> <span className="hv">{"\"Confirmed duplicate. Refund initiated, 3-5 business days.\""}</span></div><br/>
            <div><span className="hl">Next action:</span> <span className="hv">Process refund via billing console</span></div>
          </div>
        </div>
      </div></div></section>
    <div className="div"/>

    <section className="sec" id="how"><div className="sl">Operating Rhythm</div><div className="st">Heartbeat-ready after setup</div><div className="sd">LOGOFF runs on a recurring cycle of triage, follow-up, reporting, and improvement.</div>
      <div className="rhythm">{[{f:"Continuous",t:"Inbox Triage",d:"Pulls conversations. Classifies intent. Identifies hot leads + SLA risks."},{f:"Recurring",t:"Lead Follow-up",d:"Checks leads awaiting response. Sends follow-ups. Books demos."},{f:"Daily",t:"Owner Summary",d:"Conversations, response times, conversions, top issues, KB gaps."},{f:"Weekly",t:"Ops Review",d:"Objections, support categories, KB updates, experiments."}].map((r,i)=><div key={i} className="rhy"><div className="rhy-f">{r.f}</div><div className="rhy-t">{r.t}</div><div className="rhy-d">{r.d}</div></div>)}</div></section>
    <div className="div"/>

    <section className="sec-a"><div className="sec"><div className="sl">After Activation</div><div className="st">3 steps to deploy</div><div className="sd">Once your early access is activated, setup takes ~30 minutes.</div>
      <div className="steps">
        <div className="step"><div className="step-n">01</div><div className="step-t">Install widget</div><div className="step-d">Add one script tag. LOGOFF appears as a chat widget on your site.</div><div className="step-arrow">{"\u2192"}</div></div>
        <div className="step"><div className="step-n">02</div><div className="step-t">Connect knowledge base</div><div className="step-d">Point to your docs or Notion. LOGOFF answers from your source of truth.</div><div className="step-arrow">{"\u2192"}</div></div>
        <div className="step"><div className="step-n">03</div><div className="step-t">Add Slack escalations</div><div className="step-d">Connect Slack for handoff packets when human attention is needed.</div></div>
      </div></div></section>
    <div className="div"/>

    <section className="sec"><div style={{textAlign:"center",marginBottom:40}}><div className="sl">Integrations</div><div className="st">Connects to your stack</div></div>
      <div className="integ">{["Zendesk","Intercom","Freshdesk","HubSpot","Pipedrive","Salesforce","Google Calendar","Calendly","Notion","Confluence","GitBook","Slack"].map((t,i)=><div key={i} className="int-chip">{t}</div>)}</div></section>
    <div className="div"/>

    <section className="purchase" ref={buyRef} id="buy">
      <div className="sl" style={{marginBottom:8}}>Early Access</div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:42,fontWeight:700,color:"var(--cream)",marginBottom:12,letterSpacing:"-.5px"}}>Reserve your spot</h2>
      <p style={{fontSize:16,color:"var(--dim)",maxWidth:460,margin:"0 auto 48px",lineHeight:1.7}}>Pay $149 USDC on Base or Solana. Activates 30 days. Manual activation within 24 hours. {CFG.refundDays}-day refund guarantee.</p>
      <PurchaseBox wallet={wallet} onOpenLogin={onOpenLogin} onEarlyAccess={()=>nav("early-access")}/>
    </section>
    <div className="div"/>

    <section className="sec" id="faq"><div className="sl">FAQ</div><div className="st">Questions</div><div style={{maxWidth:700}}>{FAQS.map((f,i)=><FaqItem key={i} item={f}/>)}</div></section>

    <section className="sec-a" style={{textAlign:"center",padding:"80px 40px"}}>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:700,color:"var(--cream)",marginBottom:16}}>Stop hiring. Start deploying.</p>
      <p style={{fontSize:16,color:"var(--dim)",maxWidth:440,margin:"0 auto 32px",lineHeight:1.7}}>Early access spots are limited.</p>
      <button className="bg" onClick={goBuy}>{"Join Early Access \u2192"}</button>
    </section>
  </>);
}

/* ══════════════════════════ WALLET MODAL ══════════════════════════ */

function WalletModal({onClose, onConnect}){
  const[tab,setTab]=useState("base");
  const[ws,setWs]=useState("idle");
  const[err,setErr]=useState("");
  const[wallets,setWallets]=useState({hasMetaMask:false,hasCoinbase:false,hasEVM:false,hasPhantom:false});
  useEffect(()=>{const t=setTimeout(()=>setWallets(detectWallets()),300);return()=>clearTimeout(t)},[]);

  const connect=async(chain)=>{
    setWs("connecting");setErr("");
    try{
      const addr=chain==="solana"?await connectSolWallet():await connectEvmWallet();
      onConnect(chain,addr);
    }catch(e){setErr(e?.message||"Connection failed.");setWs("idle")}
  };

  return(
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>{"\u2715"}</button>
        <h2>Connect Wallet</h2>
        <p className="modal-sub">Connect to track your early access status and access dev features.</p>
        <div className="modal-tabs">
          <button className={`modal-tab ${tab==="base"?"active":""}`} onClick={()=>{setTab("base");setErr("")}}>{"\ud83d\udd35"} Base (EVM)</button>
          <button className={`modal-tab ${tab==="solana"?"active":""}`} onClick={()=>{setTab("solana");setErr("")}}>{"\ud83d\udfe3"} Solana</button>
        </div>
        {ws==="idle"&&tab==="base"&&<div className="wallet-grid">
          <button className="w-opt" onClick={()=>connect("evm")} disabled={!wallets.hasEVM}><div className="w-icon mm"><img src={metamaskIcon} alt="MetaMask" className="w-img"/></div>MetaMask<span className={`w-det ${wallets.hasMetaMask?"ok":"no"}`}>{wallets.hasMetaMask?"detected":"install"}</span></button>
          <button className="w-opt" onClick={()=>connect("evm")} disabled={!wallets.hasEVM}><div className="w-icon cb"><img src={coinbaseIcon} alt="Coinbase" className="w-img"/></div>Coinbase Wallet<span className={`w-det ${wallets.hasCoinbase?"ok":"no"}`}>{wallets.hasCoinbase?"detected":"install"}</span></button>
          {wallets.hasEVM&&!wallets.hasMetaMask&&!wallets.hasCoinbase&&<button className="w-opt" onClick={()=>connect("evm")}><div className="w-icon wc">W</div>Other Wallet<span className="w-det ok">detected</span></button>}
        </div>}
        {ws==="idle"&&tab==="solana"&&<div className="wallet-grid">
          <button className="w-opt" onClick={()=>connect("solana")} disabled={!wallets.hasPhantom}><div className="w-icon ph"><img src={phantomIcon} alt="Phantom" className="w-img"/></div>Phantom<span className={`w-det ${wallets.hasPhantom?"ok":"no"}`}>{wallets.hasPhantom?"detected":"install"}</span></button>
          {!wallets.hasPhantom&&<p style={{fontSize:12,color:"var(--mute)",textAlign:"center",padding:"8px 0"}}>Install from <span style={{color:"var(--gold)"}}>phantom.app</span></p>}
        </div>}
        {ws==="connecting"&&<button className="wbtn" disabled><div className="spn"/> Connecting...</button>}
        {err&&<div className="werr">{err}</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════ APP ══════════════════════════ */

export default function App(){
  const[page,setPage]=useState("home");
  const[mobOpen,setMobOpen]=useState(false);
  const[showLogin,setShowLogin]=useState(false);
  const[wallet,setWallet]=useState(()=>loadWalletSession());

  const nav=p=>{setPage(p);setMobOpen(false);window.scrollTo(0,0)};
  const goSection=id=>{nav("home");setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"}),100)};

  const isConnected=!!wallet?.addr;
  const isDev=!!wallet?.isDev;

  const handleConnect=(chain,addr)=>{
    const s=saveWalletSession(chain,addr);
    setWallet(s);
    setShowLogin(false);
    track("connect_wallet",{chain,isDev:s.isDev});
  };

  const handleDisconnect=()=>{
    clearWalletSession();
    setWallet(null);
    if(page==="preview") nav("home");
  };

  const openLogin=()=>setShowLogin(true);

  useEffect(()=>{if(page==="preview"&&!isDev) nav("home")},[page,isDev]);

  const NL=(label,action)=><button className="nl" onClick={action}>{label}</button>;

  const renderNavItems=(mobile)=><>
    {NL("What It Does",()=>goSection("what"))}
    {NL("How It Works",()=>goSection("how"))}
    {NL("FAQ",()=>goSection("faq"))}
    {NL("Early Access",()=>nav("early-access"))}
    {isDev&&NL("Preview",()=>nav("preview"))}
    {isConnected
      ? <>
          <div className="conn-badge">
            <span className="cb-dot"/>
            {trunc(wallet.addr)}
            <span className="cb-chain">{wallet.chain==="solana"?"SOL":"BASE"}</span>
            {isDev&&<span className="cb-dev">DEV</span>}
          </div>
          <button className="conn-disconnect" onClick={handleDisconnect}>Disconnect</button>
        </>
      : NL("Connect wallet",openLogin)
    }
    <button className={mobile?"nb":"nb"} style={mobile?{marginTop:8}:{}} onClick={()=>goSection("buy")}>{"$149 \u2192"}</button>
  </>;

  return(<>
    <div style={{minHeight:"100vh"}}>
      <nav className="nav">
        <div className="nav-b" onClick={()=>nav("home")}>
          <img src={logoffLogo} alt="LOGOFF" className="nav-logo"/>
          LOG<span>OFF</span>
        </div>
        <div className="nav-r">{renderNavItems(false)}</div>
        <button className="burger" onClick={()=>setMobOpen(!mobOpen)}>{mobOpen?"\u2715":"\u2630"}</button>
      </nav>
      <div className={`mob-menu ${mobOpen?"open":""}`}>{renderNavItems(true)}</div>

      <div className="page-wrap">
        {page==="home"&&<Landing nav={nav} wallet={wallet} onOpenLogin={openLogin}/>}
        {page==="early-access"&&<EarlyAccessPage goBuy={()=>goSection("buy")}/>}
        {page==="preview"&&isDev&&<DevPreviewPage devSession={wallet} onDisconnect={handleDisconnect}/>}
      </div>

      {page==="home"&&<WidgetDemo/>}
      {showLogin&&<WalletModal onClose={()=>setShowLogin(false)} onConnect={handleConnect}/>}

      <footer className="foot"><div className="fb">LOG<span>OFF</span></div>
        <div className="fls">
          <button className="fl" onClick={()=>nav("early-access")}>Early Access</button>
          {isDev&&<button className="fl" onClick={()=>nav("preview")}>Preview</button>}
          <a className="fl" href="https://x.com/LogoffAnon" target="_blank" rel="noopener noreferrer">@LogoffAnon</a>
          <a className="fl" href="https://x.com/LogSocrates" target="_blank" rel="noopener noreferrer">@LogSocrates</a>
        </div>
      </footer>
      <div className="fbot">Automated by <a href="https://x.com/LogSocrates" target="_blank" rel="noopener noreferrer" className="x-link">@LogSocrates</a></div>
    </div>
  </>);
}
