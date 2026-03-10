import { useState, useRef, useEffect } from "react";

/* ══════════════════════════ CONFIG ══════════════════════════ */
const CFG = {
  recipientEVM: "0x0000000000000000000000000000000000000000", // REPLACE
  recipientSOL: "11111111111111111111111111111111", // REPLACE — Solana USDC receive address
  usdcBase: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  amount: 149,
  baseChainId: "0x2105",
  demoChatEndpoint: "/demo/chat", // REPLACE with your backend URL
  contactDM: "@LogoffAnon on X",
  contactEmail: "logoff@proton.me", // REPLACE
  refundDays: 7,
  devMode: typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"),
  devWallets: {
    evm: ["0x0000000000000000000000000000000000000000"], // REPLACE with your EVM dev wallet
    solana: ["9BkQ1R427KpxdiFK3yX56fbL2v2erhf64PcDnbrFXSns"],
  },
};

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

/* ══════════════════════════ CSS ══════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,700&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg:#050403;--bg2:#0c0a07;--card:#110e09;--card2:#18140d;--gold:#c9a84c;--gold-b:#e0c465;--gold-d:#8a6d2b;--sepia:#b89a5a;--cream:#e8dfd0;--txt:#d4cabb;--dim:#8a8070;--mute:#5a5245;--bdr:#1e1a12;--bdr-g:rgba(201,168,76,0.18);--grn:#6dca6d;--grn-bg:rgba(109,202,109,0.08);--red:#d46a6a}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{font-family:'Manrope',sans-serif;background:var(--bg);color:var(--txt);-webkit-font-smoothing:antialiased;line-height:1.6}

/* Nav */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:14px 40px;background:rgba(5,4,3,0.92);backdrop-filter:blur(24px);border-bottom:1px solid var(--bdr)}
.nav-b{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:var(--cream);letter-spacing:1px;cursor:pointer}.nav-b span{color:var(--gold);font-style:italic}
.nav-r{display:flex;gap:8px;align-items:center}
.nl{padding:7px 14px;font-size:13px;color:var(--dim);border:none;background:none;cursor:pointer;font-family:inherit;border-radius:6px;transition:all .2s}.nl:hover{color:var(--cream);background:rgba(201,168,76,.05)}
.nb{padding:8px 22px;font-size:13px;font-weight:600;color:var(--bg);background:var(--gold);border:none;border-radius:6px;cursor:pointer;font-family:inherit;transition:all .2s}.nb:hover{background:var(--gold-b);transform:translateY(-1px);box-shadow:0 4px 20px rgba(201,168,76,.3)}
.burger{display:none;background:none;border:none;color:var(--cream);font-size:24px;cursor:pointer;padding:4px 8px}
.mob-menu{display:none;position:fixed;top:55px;left:0;right:0;background:rgba(5,4,3,0.97);backdrop-filter:blur(24px);border-bottom:1px solid var(--bdr);padding:16px 20px;flex-direction:column;gap:4px;z-index:99}.mob-menu.open{display:flex}.mob-menu .nl{text-align:left;padding:12px 16px;font-size:15px}

.page-wrap{padding-top:60px;min-height:100vh}
.sec{padding:100px 40px;max-width:1080px;margin:0 auto}.sec-a{background:var(--bg2)}
.sl{font-size:11px;font-weight:600;color:var(--gold);text-transform:uppercase;letter-spacing:2.5px;margin-bottom:14px}
.st{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:700;margin-bottom:14px;letter-spacing:-.5px;color:var(--cream)}
.sd{font-size:16px;color:var(--dim);max-width:560px;line-height:1.7;margin-bottom:48px}
.div{width:50px;height:1px;background:linear-gradient(90deg,transparent,var(--gold-d),transparent);margin:0 auto}
.bg{padding:15px 36px;font-size:15px;font-weight:600;color:var(--bg);background:linear-gradient(135deg,var(--gold),var(--sepia));border:none;border-radius:8px;cursor:pointer;font-family:inherit;transition:all .25s;display:inline-flex;align-items:center;gap:8px}.bg:hover{background:linear-gradient(135deg,var(--gold-b),var(--gold));transform:translateY(-2px);box-shadow:0 8px 36px rgba(201,168,76,.3)}
.bgh{padding:15px 36px;font-size:15px;font-weight:500;color:var(--cream);background:none;border:1px solid var(--bdr);border-radius:8px;cursor:pointer;font-family:inherit;transition:all .25s}.bgh:hover{border-color:var(--gold-d);color:var(--gold)}

/* Hero */
.hero{padding:180px 40px 120px;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-400px;left:50%;transform:translateX(-50%);width:1200px;height:1200px;background:radial-gradient(ellipse,rgba(201,168,76,.04) 0%,rgba(138,109,43,.015) 30%,transparent 60%);pointer-events:none}
.h-label{display:inline-flex;align-items:center;gap:8px;padding:5px 16px;border:1px solid var(--bdr-g);border-radius:100px;font-size:11px;font-weight:500;color:var(--gold);text-transform:uppercase;letter-spacing:2px;margin-bottom:40px;background:rgba(201,168,76,.03);animation:fi .8s ease}
.h-label .p{width:6px;height:6px;border-radius:50%;background:#c9a84c;animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
.hero h1{font-family:'Cormorant Garamond',serif;font-size:clamp(48px,7vw,86px);font-weight:700;line-height:1.0;margin-bottom:28px;letter-spacing:-1px;color:var(--cream);animation:fu .8s ease}
.hero h1 em{color:var(--gold);font-style:italic;text-shadow:0 0 60px rgba(201,168,76,.15)}
.h-sub{font-size:19px;color:var(--dim);max-width:600px;margin:0 auto 12px;line-height:1.7;animation:fu .8s ease .1s both}
.h-tag{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--mute);margin-bottom:48px;animation:fu .8s ease .15s both;letter-spacing:.5px}
.h-acts{display:flex;gap:14px;justify-content:center;align-items:center;animation:fu .8s ease .2s both;flex-wrap:wrap}
.proof{display:flex;justify-content:center;gap:48px;margin-top:72px;padding-top:40px;border-top:1px solid var(--bdr);animation:fu .8s ease .3s both;flex-wrap:wrap}
.pv{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:var(--gold)}.pl{font-size:11px;color:var(--mute);text-transform:uppercase;letter-spacing:2px;margin-top:4px}

/* Compare */
.compare{display:grid;grid-template-columns:1fr auto 1fr;gap:0;max-width:800px;margin:0 auto}
.comp-col{padding:36px 32px;background:var(--card);border:1px solid var(--bdr);border-radius:12px}.comp-col.gc{border-color:var(--bdr-g);background:linear-gradient(180deg,rgba(201,168,76,.04),var(--card))}
.comp-vs{display:flex;align-items:center;justify-content:center;padding:0 20px;font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--mute);font-style:italic}
.comp-h{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;margin-bottom:20px}.comp-h.gh{color:var(--gold)}
.cr{font-size:14px;color:var(--dim);padding:10px 0;border-bottom:1px solid rgba(30,26,18,.6);display:flex;align-items:center;gap:10px;line-height:1.5}.cr:last-child{border:none}
.cr .x{color:var(--red);font-size:16px;flex-shrink:0}.cr .ck{color:var(--grn);font-size:16px;flex-shrink:0}

/* Caps */
.caps{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.cap{padding:32px;background:var(--card);border:1px solid var(--bdr);border-radius:12px;transition:all .3s;position:relative;overflow:hidden}
.cap::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0),transparent);transition:all .4s}
.cap:hover{border-color:var(--bdr-g);transform:translateY(-3px);box-shadow:0 12px 36px rgba(0,0,0,.5)}.cap:hover::after{background:linear-gradient(90deg,transparent,rgba(201,168,76,.4),transparent)}
.cap-i{font-size:28px;margin-bottom:14px}.cap-t{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--cream);margin-bottom:10px}
.cap-d{font-size:14px;color:var(--dim);line-height:1.7;margin-bottom:14px}
.cap-m{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--gold);padding:4px 12px;background:rgba(201,168,76,.1);border-radius:4px;display:inline-block;letter-spacing:.5px}

/* Rhythm */
.rhythm{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.rhy{padding:28px;background:var(--card);border:1px solid var(--bdr);border-radius:12px;transition:all .3s;text-align:center}.rhy:hover{border-color:var(--bdr-g);transform:translateY(-2px)}
.rhy-f{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px}
.rhy-t{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--cream);margin-bottom:8px}.rhy-d{font-size:13px;color:var(--dim);line-height:1.6}

/* Steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.step{padding:32px;background:var(--card);border:1px solid var(--bdr);border-radius:12px;text-align:center;transition:all .3s;position:relative}.step:hover{border-color:var(--bdr-g);transform:translateY(-2px)}
.step-n{font-family:'JetBrains Mono',monospace;font-size:32px;color:var(--gold);opacity:.3;margin-bottom:12px}
.step-t{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:var(--cream);margin-bottom:8px}.step-d{font-size:13px;color:var(--dim);line-height:1.6}
.step-arrow{position:absolute;right:-14px;top:50%;transform:translateY(-50%);color:var(--gold-d);font-size:20px}

/* Demo */
.demo-wrap{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:900px}
.demo-card{padding:24px;background:var(--card);border:1px solid var(--bdr);border-radius:12px}
.demo-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;padding:3px 8px;background:rgba(201,168,76,.08);border-radius:4px;display:inline-block}
.demo-msg{padding:12px 16px;border-radius:10px;margin-bottom:10px;font-size:14px;line-height:1.6;max-width:85%}
.demo-msg.user{background:rgba(201,168,76,.08);border:1px solid var(--bdr-g);color:var(--cream);margin-left:auto;text-align:right;border-bottom-right-radius:4px}
.demo-msg.agent{background:var(--bg2);border:1px solid var(--bdr);color:var(--dim);border-bottom-left-radius:4px}
.demo-msg.agent strong{color:var(--cream);font-weight:500}
.handoff{font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.8;color:var(--dim)}.handoff .hl{color:var(--gold)}.handoff .hv{color:var(--cream)}

/* Integrations */
.integ{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.int-chip{padding:10px 20px;background:var(--card);border:1px solid var(--bdr);border-radius:8px;font-size:13px;color:var(--dim);transition:all .2s;font-family:'JetBrains Mono',monospace;letter-spacing:.3px}.int-chip:hover{border-color:var(--bdr-g);color:var(--cream)}

/* Purchase */
.purchase{text-align:center;padding:120px 40px;position:relative}
.purchase::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(ellipse,rgba(201,168,76,.03) 0%,transparent 55%);pointer-events:none}
.pbox{max-width:540px;margin:0 auto;padding:48px 40px;background:var(--card);border:1px solid var(--bdr-g);border-radius:16px;position:relative;box-shadow:0 0 80px rgba(201,168,76,.04)}
.pprice{font-family:'JetBrains Mono',monospace;font-size:52px;font-weight:500;color:var(--cream);margin-bottom:4px}.pprice sup{font-size:18px;color:var(--dim);font-weight:400}
.pcur{font-size:14px;color:var(--mute);margin-bottom:28px;font-family:'JetBrains Mono',monospace}
.ea-badge{display:inline-block;padding:4px 12px;font-size:10px;font-weight:600;color:var(--gold);background:rgba(201,168,76,.1);border:1px solid var(--bdr-g);border-radius:4px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px}
.pinc{text-align:left;margin-bottom:28px;padding:20px 24px;background:rgba(201,168,76,.03);border-radius:8px;border:1px solid rgba(201,168,76,.08)}
.pinc p{font-size:13px;color:var(--dim);margin-bottom:6px;line-height:1.6}.pinc p:last-child{margin-bottom:0}.pinc span{color:var(--gold);margin-right:8px}
.wallet-grid{display:flex;flex-direction:column;gap:10px;margin-bottom:16px}
.w-opt{width:100%;padding:14px 16px;background:var(--bg2);border:1px solid var(--bdr);border-radius:10px;cursor:pointer;transition:all .2s;font-family:inherit;color:var(--cream);font-size:14px;font-weight:500;display:flex;align-items:center;gap:12px}
.w-opt:hover{border-color:var(--bdr-g);background:var(--card2)}.w-opt:disabled{opacity:.4;cursor:not-allowed}
.w-icon{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;font-weight:700;color:#fff}
.w-icon.mm{background:linear-gradient(135deg,#f6851b,#e2761b)}.w-icon.cb{background:linear-gradient(135deg,#0052ff,#0040cc)}.w-icon.wc{background:linear-gradient(135deg,#3b99fc,#2d7dd2)}
.w-det{font-size:11px;margin-left:auto;padding:2px 8px;border-radius:4px;font-family:'JetBrains Mono',monospace}.w-det.ok{color:var(--grn);background:var(--grn-bg)}.w-det.no{color:var(--mute);background:rgba(90,82,69,.15)}
.wbtn{width:100%;padding:16px;font-size:16px;font-weight:600;color:var(--bg);background:linear-gradient(135deg,var(--gold),var(--sepia));border:none;border-radius:10px;cursor:pointer;font-family:inherit;transition:all .25s;display:flex;align-items:center;justify-content:center;gap:10px}
.wbtn:hover{background:linear-gradient(135deg,var(--gold-b),var(--gold));transform:translateY(-2px);box-shadow:0 8px 36px rgba(201,168,76,.35)}.wbtn:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
.wcon{padding:12px 16px;background:var(--grn-bg);border:1px solid rgba(109,202,109,.15);border-radius:8px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:8px}
.wcon .dt{width:8px;height:8px;border-radius:50%;background:var(--grn)}.wcon span{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--grn)}
.wcon .cb2{font-size:11px;padding:2px 8px;background:rgba(201,168,76,.1);color:var(--gold);border-radius:4px;margin-left:8px}
.wnote{font-size:12px;color:var(--mute);margin-top:16px;line-height:1.6}
.werr{padding:10px 14px;background:rgba(212,106,106,.08);border:1px solid rgba(212,106,106,.15);border-radius:8px;margin-bottom:16px;font-size:13px;color:var(--red);text-align:left}

/* Post-payment confirmation */
.confirm-box{text-align:left;padding:24px;background:var(--bg2);border:1px solid var(--bdr);border-radius:10px;margin-top:20px}
.confirm-box h4{font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--cream);margin-bottom:12px}
.confirm-box p{font-size:13px;color:var(--dim);line-height:1.7;margin-bottom:8px}
.confirm-box .tx-hash{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--gold);word-break:break-all;padding:8px 12px;background:var(--card);border:1px solid var(--bdr);border-radius:6px;margin:8px 0}
.confirm-box .contact-line{display:flex;align-items:center;gap:8px;padding:8px 0;font-size:13px;color:var(--cream)}

/* FAQ */
.faq-i{border-bottom:1px solid var(--bdr)}
.faq-q{padding:20px 0;font-size:16px;font-weight:500;color:var(--cream);cursor:pointer;display:flex;justify-content:space-between;align-items:center;border:none;background:none;width:100%;text-align:left;font-family:inherit;transition:color .2s}.faq-q:hover{color:var(--gold)}
.faq-ar{font-size:18px;color:var(--mute);transition:transform .3s;flex-shrink:0;margin-left:16px}.faq-ar.o{transform:rotate(180deg);color:var(--gold)}
.faq-a{padding:0 0 20px;font-size:14px;color:var(--dim);line-height:1.7}

/* Early Access page */
.ea-page{padding:140px 40px 80px;max-width:700px;margin:0 auto;text-align:center}
.ea-page h1{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:700;color:var(--cream);margin-bottom:16px}
.ea-page .ea-sub{font-size:17px;color:var(--dim);line-height:1.7;margin-bottom:40px}
.ea-roadmap{text-align:left;max-width:480px;margin:0 auto 40px}
.ea-item{padding:16px 20px;background:var(--card);border:1px solid var(--bdr);border-radius:10px;margin-bottom:10px;display:flex;align-items:center;gap:14px;font-size:14px;color:var(--dim);transition:all .2s}
.ea-item:hover{border-color:var(--bdr-g)}
.ea-item .ea-dot{width:8px;height:8px;border-radius:50%;background:var(--gold-d);flex-shrink:0}

/* Widget */
.widget-demo{position:fixed;bottom:24px;right:24px;z-index:90}
.widget-btn{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--sepia));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 20px rgba(201,168,76,.3);transition:all .2s}.widget-btn:hover{transform:scale(1.08)}
.widget-panel{position:absolute;bottom:68px;right:0;width:360px;max-height:500px;background:var(--card);border:1px solid var(--bdr-g);border-radius:14px;box-shadow:0 12px 48px rgba(0,0,0,.6);overflow:hidden;display:flex;flex-direction:column}
.widget-head{padding:16px 20px;border-bottom:1px solid var(--bdr);display:flex;align-items:center;gap:10px}
.widget-head .wh-dot{width:8px;height:8px;border-radius:50%;background:var(--grn)}.widget-head .wh-name{font-weight:600;color:var(--cream);font-size:14px}.widget-head .wh-sub{font-size:11px;color:var(--mute)}
.widget-notice{padding:8px 16px;background:rgba(201,168,76,.06);border-bottom:1px solid var(--bdr);font-size:11px;color:var(--gold);text-align:center;font-family:'JetBrains Mono',monospace;letter-spacing:.3px}
.widget-msgs{flex:1;padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;min-height:240px}
.widget-m{padding:10px 14px;border-radius:10px;font-size:13px;line-height:1.5;max-width:80%}
.widget-m.bot{background:var(--bg2);border:1px solid var(--bdr);color:var(--dim);border-bottom-left-radius:4px;align-self:flex-start}
.widget-m.usr{background:rgba(201,168,76,.1);border:1px solid var(--bdr-g);color:var(--cream);border-bottom-right-radius:4px;align-self:flex-end}
.widget-input{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--bdr)}
.widget-input input{flex:1;padding:10px 12px;background:var(--bg2);border:1px solid var(--bdr);border-radius:8px;color:var(--cream);font-family:inherit;font-size:13px;outline:none}.widget-input input::placeholder{color:var(--mute)}
.widget-input button{padding:10px 16px;background:var(--gold);color:var(--bg);border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;transition:all .2s}.widget-input button:hover{background:var(--gold-b)}

/* Login modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)}
.modal{max-width:440px;width:100%;background:var(--card);border:1px solid var(--bdr-g);border-radius:16px;padding:40px 32px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.modal-close{position:absolute;top:16px;right:16px;background:none;border:none;color:var(--mute);font-size:20px;cursor:pointer;padding:4px 8px;border-radius:4px;transition:all .2s}.modal-close:hover{color:var(--cream);background:rgba(201,168,76,.05)}
.modal h2{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:var(--cream);margin-bottom:6px;text-align:center}
.modal .modal-sub{font-size:14px;color:var(--dim);text-align:center;margin-bottom:24px}
.modal-tabs{display:flex;gap:8px;margin-bottom:20px}
.modal-tab{flex:1;padding:10px;background:var(--bg2);border:1px solid var(--bdr);border-radius:8px;cursor:pointer;text-align:center;font-family:inherit;color:var(--dim);font-size:13px;transition:all .2s;font-weight:500}
.modal-tab:hover{border-color:var(--bdr-g);color:var(--cream)}.modal-tab.active{border-color:var(--gold-d);background:rgba(201,168,76,.05);color:var(--cream)}

/* Connected badge (navbar) */
.conn-badge{display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(201,168,76,.06);border:1px solid var(--bdr-g);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--gold)}
.conn-badge .cb-dot{width:6px;height:6px;border-radius:50%;background:var(--grn)}
.conn-badge .cb-chain{font-size:10px;color:var(--mute);margin-left:2px}
.conn-badge .cb-dev{font-size:9px;color:var(--bg);background:var(--gold);padding:1px 6px;border-radius:3px;margin-left:4px;font-weight:700;letter-spacing:.5px}
.conn-disconnect{font-size:11px;color:var(--mute);background:none;border:none;cursor:pointer;font-family:inherit;padding:4px 8px;border-radius:4px;transition:all .2s}.conn-disconnect:hover{color:var(--red)}

/* Preview page */
.preview{padding:100px 40px 60px;max-width:800px;margin:0 auto}
.preview h1{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:var(--cream);margin-bottom:8px}
.preview-badge{display:inline-flex;align-items:center;gap:8px;padding:5px 14px;border:1px solid var(--bdr-g);border-radius:100px;font-size:11px;font-weight:500;color:var(--gold);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:20px;background:rgba(201,168,76,.04)}
.preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:32px}
.preview-card{padding:24px;background:var(--card);border:1px solid var(--bdr);border-radius:12px;position:relative}
.preview-card .pc-tag{position:absolute;top:12px;right:12px;font-size:10px;color:var(--mute);background:rgba(90,82,69,.2);padding:2px 8px;border-radius:4px;font-family:'JetBrains Mono',monospace;letter-spacing:.5px}
.preview-card h3{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--cream);margin-bottom:6px}
.preview-card p{font-size:13px;color:var(--dim);line-height:1.6}
.preview-snippet{margin-top:16px;padding:12px;background:var(--bg);border:1px solid var(--bdr);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--dim);overflow-x:auto;white-space:pre-wrap;line-height:1.5}
.preview-copy{margin-top:8px;padding:6px 14px;font-size:11px;color:var(--gold);background:none;border:1px solid var(--bdr-g);border-radius:6px;cursor:pointer;font-family:inherit}.preview-copy:hover{background:rgba(201,168,76,.05)}
.preview-disconnect{margin-top:24px;padding:8px 16px;font-size:12px;color:var(--mute);background:none;border:1px solid var(--bdr);border-radius:6px;cursor:pointer;font-family:inherit}.preview-disconnect:hover{color:var(--red);border-color:rgba(212,106,106,.3)}

/* Solana manual payment */
.sol-manual{margin-top:16px;padding:16px 20px;background:var(--bg2);border:1px solid var(--bdr);border-radius:10px;text-align:left}
.sol-manual h4{font-size:14px;color:var(--cream);margin-bottom:8px}
.sol-manual p{font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:6px}
.sol-manual .sol-addr{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--gold);word-break:break-all;padding:8px 12px;background:var(--card);border:1px solid var(--bdr);border-radius:6px;margin:6px 0}
.chain-tabs{display:flex;gap:8px;margin-bottom:20px}
.chain-tab{flex:1;padding:10px;background:var(--bg2);border:1px solid var(--bdr);border-radius:8px;cursor:pointer;text-align:center;font-family:inherit;color:var(--dim);font-size:13px;transition:all .2s;font-weight:500}
.chain-tab:hover{border-color:var(--bdr-g);color:var(--cream)}.chain-tab.active{border-color:var(--gold-d);background:rgba(201,168,76,.05);color:var(--cream)}
.chain-tab .ct-sub{font-size:10px;color:var(--mute);font-family:'JetBrains Mono',monospace;margin-top:2px}

/* Footer */
.foot{padding:40px;border-top:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.fb{font-family:'Cormorant Garamond',serif;font-size:16px;color:var(--mute)}.fb span{color:var(--gold-d)}
.fls{display:flex;gap:16px;flex-wrap:wrap}
.fl{font-size:12px;color:var(--mute);border:none;background:none;cursor:pointer;font-family:inherit;transition:color .2s}.fl:hover{color:var(--dim)}
.fbot{text-align:center;padding:0 40px 20px;font-size:11px;color:var(--mute);font-family:'JetBrains Mono',monospace;letter-spacing:.5px}

@keyframes fi{from{opacity:0}to{opacity:1}}
@keyframes fu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.spn{width:18px;height:18px;border:2px solid rgba(5,4,3,.3);border-top-color:var(--bg);border-radius:50%;animation:spin .8s linear infinite}

@media(max-width:768px){
  .nav{padding:12px 20px}.nav-r{display:none}.burger{display:block}
  .hero{padding:130px 20px 80px}.proof{gap:24px}
  .sec{padding:60px 20px}.caps,.rhythm,.steps{grid-template-columns:1fr}
  .compare{grid-template-columns:1fr;gap:16px}.comp-vs{padding:10px 0}
  .pbox{padding:32px 24px}.demo-wrap{grid-template-columns:1fr}
  .step-arrow{display:none}.widget-panel{width:calc(100vw - 32px);right:-8px}
  .foot{flex-direction:column;text-align:center}
}
`;

/* ══════════════════════════ COMPONENTS ══════════════════════════ */

function Orb(){return(<svg viewBox="0 0 140 140" style={{width:140,height:140,margin:"0 auto 48px",display:"block",animation:"fi 1s ease"}}><defs><radialGradient id="h" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#000"/><stop offset="40%" stopColor="#080604"/><stop offset="60%" stopColor="#1a1508"/><stop offset="78%" stopColor="#c9a84c" stopOpacity="0.5"/><stop offset="90%" stopColor="#dfc06e" stopOpacity="0.15"/><stop offset="100%" stopColor="transparent"/></radialGradient><filter id="gl"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="70" cy="70" r="68" fill="none" stroke="#c9a84c" strokeWidth="0.4" opacity="0.12"/><circle cx="70" cy="70" r="52" fill="url(#h)"/><ellipse cx="70" cy="70" rx="66" ry="20" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.2" filter="url(#gl)"/><ellipse cx="70" cy="70" rx="58" ry="15" fill="none" stroke="#dfc06e" strokeWidth="0.4" opacity="0.12"/><circle cx="70" cy="70" r="9" fill="#000"/><circle cx="70" cy="70" r="14" fill="none" stroke="#c9a84c" strokeWidth="0.7" opacity="0.4"/>{[30,90,150,210,270,330].map((a,i)=><circle key={i} cx={70+60*Math.cos(a*Math.PI/180)} cy={70+60*Math.sin(a*Math.PI/180)*0.32} r={0.8+(i%3)*0.4} fill="#c9a84c" opacity={0.25+(i%3)*0.15}/>)}</svg>)}

function FaqItem({item}){const[o,setO]=useState(false);return(<div className="faq-i"><button className="faq-q" onClick={()=>setO(!o)}>{item.q}<span className={`faq-ar ${o?"o":""}`}>{"\u25be"}</span></button>{o&&<div className="faq-a">{item.a}</div>}</div>)}

function detectWallets(){return{hasMetaMask:!!window.ethereum?.isMetaMask,hasCoinbase:!!(window.ethereum?.isCoinbaseWallet||window.coinbaseWalletExtension),hasEVM:!!window.ethereum,hasPhantom:!!(window.phantom?.solana?.isPhantom||window.solana?.isPhantom)}}
const trunc=a=>a?a.slice(0,6)+"..."+a.slice(-4):"";

/* ══════════════════════════ WIDGET DEMO ══════════════════════════ */

function WidgetDemo(){
  const[open,setOpen]=useState(false);
  const[msgs,setMsgs]=useState([{from:"bot",text:"Hey! I'm LOGOFF, an AI customer ops agent. Try asking me something \u2014 like a support question or a pricing inquiry."}]);
  const[inp,setInp]=useState("");
  const[convId]=useState(()=>"demo-"+Date.now().toString(36));
  const[loading,setLoading]=useState(false);

  const send=async()=>{
    if(!inp.trim()||loading)return;
    const userMsg=inp;setInp("");
    setMsgs(p=>[...p,{from:"usr",text:userMsg}]);
    setLoading(true);
    try{
      const res=await fetch(CFG.demoChatEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMsg,conversationId:convId})});
      if(res.ok){const data=await res.json();setMsgs(p=>[...p,{from:"bot",text:data.reply||"Got it. Let me look into that."}]);setLoading(false);return}
    }catch{}
    // Fallback only in devMode
    if(CFG.devMode){
      const demo=["Let me check that for you. One moment...","Here's the fastest path to resolve this.","I can handle this autonomously. Would you like me to proceed?","I've found the relevant info in the knowledge base."];
      setTimeout(()=>{setMsgs(prev=>[...prev,{from:"bot",text:demo[prev.length%demo.length]}]);setLoading(false)},800);
    }else{
      setMsgs(p=>[...p,{from:"bot",text:"Demo temporarily unavailable. Try again shortly."}]);setLoading(false);
    }
  };
  return(
    <div className="widget-demo">
      {open&&<div className="widget-panel">
        <div className="widget-head"><span className="wh-dot"/><div><div className="wh-name">LOGOFF</div><div className="wh-sub">AI Customer Ops</div></div></div>
        <div className="widget-notice">Demo {"\u2014"} limited. Production requires early access activation.</div>
        <div className="widget-msgs">{msgs.map((m,i)=><div key={i} className={`widget-m ${m.from==="bot"?"bot":"usr"}`}>{m.text}</div>)}{loading&&<div className="widget-m bot" style={{opacity:.5}}>Typing...</div>}</div>
        <div className="widget-input"><input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask something..."/><button onClick={send}>{"\u2192"}</button></div>
      </div>}
      <button className="widget-btn" onClick={()=>setOpen(!open)}>{open?"\u2715":"\ud83d\udcac"}</button>
    </div>
  );
}

/* ══════════════════════════ PURCHASE ══════════════════════════ */

function PurchaseBox({onEarlyAccess}){
  const[payChain,setPayChain]=useState("base");
  const[ws,setWs]=useState("idle");
  const[addr,setAddr]=useState("");
  const[err,setErr]=useState("");
  const[txHash,setTxHash]=useState(null);
  const[paidChain,setPaidChain]=useState(null);
  const[wallets,setWallets]=useState({hasMetaMask:false,hasCoinbase:false,hasEVM:false,hasPhantom:false});
  useEffect(()=>{const t=setTimeout(()=>setWallets(detectWallets()),500);return()=>clearTimeout(t)},[]);
  const reset=()=>{setWs("idle");setAddr("");setErr("");setTxHash(null)};

  // ── EVM connect ──
  const connectEVM=async()=>{
    setWs("connecting");setErr("");
    try{const a=await connectEvmWallet();setAddr(a);setWs("connected")}
    catch(e){setErr(e?.message||"Connection failed.");setWs("idle")}
  };

  // ── Phantom connect ──
  const connectPhantom=async()=>{
    setWs("connecting");setErr("");
    try{const a=await connectSolWallet();setAddr(a);setWs("connected")}
    catch(e){setErr(e?.message||"Connection failed.");setWs("idle")}
  };

  // ── Base USDC pay ──
  const payBase=async()=>{
    setWs("paying");setErr("");
    try{
      const p=window.ethereum;
      const amtHex="0x"+(BigInt(CFG.amount)*BigInt(1e6)).toString(16);
      const sig="0xa9059cbb";
      const data=sig+CFG.recipientEVM.slice(2).padStart(64,"0")+amtHex.slice(2).padStart(64,"0");
      const hash=await p.request({method:"eth_sendTransaction",params:[{from:addr,to:CFG.usdcBase,data,value:"0x0"}]});
      setTxHash(hash);setPaidChain("Base");setWs("done");
    }catch(e){setErr(e?.message||"Transaction failed.");setWs("connected")}
  };

  // ── Solana SPL USDC pay via Phantom ──
  const paySolana=async()=>{
    setWs("paying");setErr("");
    try{
      const provider=window.phantom?.solana||window.solana;
      if(!provider)throw new Error("Phantom not found");

      // Load @solana/web3.js from CDN if not loaded
      if(!window.solanaWeb3){
        await new Promise((resolve,reject)=>{
          const s=document.createElement("script");
          s.src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js";
          s.onload=resolve;s.onerror=()=>reject(new Error("Failed to load Solana library"));
          document.head.appendChild(s);
        });
      }
      const{Connection,PublicKey,Transaction,TransactionInstruction,SystemProgram}=window.solanaWeb3;

      const connection=new Connection("https://api.mainnet-beta.solana.com","confirmed");
      const fromPubkey=new PublicKey(addr);
      const toPubkey=new PublicKey(CFG.recipientSOL);
      const usdcMint=new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
      const TOKEN_PROGRAM=new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      const ATA_PROGRAM=new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
      const RENT=new PublicKey("SysvarRent111111111111111111111111111111111");

      // Derive ATAs
      const[fromATA]=PublicKey.findProgramAddressSync([fromPubkey.toBuffer(),TOKEN_PROGRAM.toBuffer(),usdcMint.toBuffer()],ATA_PROGRAM);
      const[toATA]=PublicKey.findProgramAddressSync([toPubkey.toBuffer(),TOKEN_PROGRAM.toBuffer(),usdcMint.toBuffer()],ATA_PROGRAM);

      // Build transfer instruction (SPL transferChecked = index 12)
      const amountRaw=BigInt(CFG.amount)*BigInt(1e6);
      const dataArr=new Uint8Array(1+8+1);
      dataArr[0]=12; // transferChecked
      new DataView(dataArr.buffer).setBigUint64(1,amountRaw,true);
      dataArr[9]=6; // decimals

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

      // Check if recipient ATA exists
      const toATAInfo=await connection.getAccountInfo(toATA);
      if(!toATAInfo){
        // Create ATA instruction
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
      const msg=e?.message||"Solana transaction failed.";
      if(msg.includes("signAndSend")){setErr("Phantom signAndSendTransaction not supported. Use manual transfer below.")}
      else{setErr(msg)}
      setWs("connected");
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

  // ── Main purchase UI ──
  return(
    <div className="pbox">
      <div className="ea-badge">Early Access</div>
      <div className="pprice">$149<sup style={{fontSize:15,color:"var(--dim)"}}> / 30 days</sup></div>
      <div className="pcur">USDC {"\u00b7"} Activates 30 days {"\u00b7"} Renew manually {"\u00b7"} We remind you</div>

      <div className="chain-tabs">
        <button className={`chain-tab ${payChain==="base"?"active":""}`} onClick={()=>{setPayChain("base");reset()}}>{"\ud83d\udd35"} Base<div className="ct-sub">Pay now</div></button>
        <button className={`chain-tab ${payChain==="solana"?"active":""}`} onClick={()=>{setPayChain("solana");reset()}}>{"\ud83d\udfe3"} Solana<div className="ct-sub">Pay now</div></button>
      </div>

      <div className="pinc">
        <p><span>{"\u2192"}</span>Payment reserves your early access spot</p>
        <p><span>{"\u2192"}</span>Manual onboarding after confirmation</p>
        <p><span>{"\u2192"}</span>Full refund if not activated within {CFG.refundDays} days</p>
        <p><span>{"\u2192"}</span>Priority access to new features</p>
      </div>

      {/* ── Base: EVM wallet connect ── */}
      {payChain==="base"&&<>
        {ws==="idle"&&<>
          <div style={{fontSize:12,color:"var(--mute)",marginBottom:10,textAlign:"left",textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Connect wallet</div>
          <div className="wallet-grid">
            <button className="w-opt" onClick={connectEVM} disabled={!wallets.hasEVM}><div className="w-icon mm">M</div>MetaMask<span className={`w-det ${wallets.hasMetaMask?"ok":"no"}`}>{wallets.hasMetaMask?"detected":"install"}</span></button>
            <button className="w-opt" onClick={connectEVM} disabled={!wallets.hasEVM}><div className="w-icon cb">C</div>Coinbase Wallet<span className={`w-det ${wallets.hasCoinbase?"ok":"no"}`}>{wallets.hasCoinbase?"detected":"install"}</span></button>
            {wallets.hasEVM&&!wallets.hasMetaMask&&!wallets.hasCoinbase&&<button className="w-opt" onClick={connectEVM}><div className="w-icon wc">W</div>Other Wallet<span className="w-det ok">detected</span></button>}
          </div>
        </>}
        {ws==="connected"&&<><div className="wcon"><span className="dt"/><span>{trunc(addr)}</span><span className="cb2">Base</span></div>
          <button className="wbtn" onClick={payBase}>Pay $149 USDC (30 days) {"\u2192"}</button>
          <div style={{marginTop:10}}><button onClick={reset} style={{fontSize:12,color:"var(--mute)",border:"none",background:"none",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Change wallet</button></div></>}
        {ws==="paying"&&<button className="wbtn" disabled><div className="spn"/> Sending on Base...</button>}
        {ws==="connecting"&&<button className="wbtn" disabled><div className="spn"/> Connecting...</button>}
      </>}

      {/* ── Solana: Phantom connect + SPL pay ── */}
      {payChain==="solana"&&<>
        {ws==="idle"&&<>
          <div style={{fontSize:12,color:"var(--mute)",marginBottom:10,textAlign:"left",textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Connect Phantom</div>
          <div className="wallet-grid">
            <button className="w-opt" onClick={connectPhantom} disabled={!wallets.hasPhantom}><div className="w-icon" style={{background:"linear-gradient(135deg,#ab9ff2,#7b6fe0)"}}>P</div>Phantom<span className={`w-det ${wallets.hasPhantom?"ok":"no"}`}>{wallets.hasPhantom?"detected":"install"}</span></button>
            {!wallets.hasPhantom&&<p style={{fontSize:12,color:"var(--mute)",textAlign:"center",padding:"4px 0"}}>Install from <span style={{color:"var(--gold)"}}>phantom.app</span></p>}
          </div>
        </>}
        {ws==="connected"&&<><div className="wcon"><span className="dt"/><span>{trunc(addr)}</span><span className="cb2">Solana</span></div>
          <button className="wbtn" onClick={paySolana}>Pay $149 USDC (30 days) {"\u2192"}</button>
          <div style={{marginTop:10}}><button onClick={reset} style={{fontSize:12,color:"var(--mute)",border:"none",background:"none",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Change wallet</button></div></>}
        {ws==="paying"&&<button className="wbtn" disabled><div className="spn"/> Sending on Solana...</button>}
        {ws==="connecting"&&<button className="wbtn" disabled><div className="spn"/> Connecting Phantom...</button>}

        {/* Manual fallback */}
        {ws==="idle"&&<div className="sol-manual" style={{marginTop:16}}>
          <h4>Or send manually:</h4>
          <div className="sol-addr">{CFG.recipientSOL}</div>
          <button style={{padding:"6px 14px",fontSize:11,color:"var(--gold)",background:"none",border:"1px solid var(--bdr-g)",borderRadius:6,cursor:"pointer",fontFamily:"inherit",marginBottom:8}} onClick={()=>{try{navigator.clipboard.writeText(CFG.recipientSOL)}catch(e){}}}>Copy address</button>
          <p style={{fontSize:12,color:"var(--mute)"}}>Send 149 USDC (SPL) then DM/email your tx hash to {CFG.contactDM}</p>
        </div>}
      </>}

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

const CAPS=[
  {icon:"\ud83c\udfa7",title:"Customer Support",desc:"Triage every inbound ticket. KB-driven answers. SLA-aware prioritization. When LOGOFF cannot resolve, it escalates with a complete handoff packet \u2014 summary, sentiment, timeline, and a paste-ready recommended reply.",metric:"Heartbeat-ready"},
  {icon:"\ud83c\udfaf",title:"Sales Qualification",desc:"Detects high-intent signals: pricing page visits, integration questions, deadline mentions. Qualifies leads, handles objections, and books demos through your calendar.",metric:"Continuous"},
  {icon:"\ud83d\ude80",title:"User Onboarding",desc:"Guides new signups through checklist-driven milestone funnels. Identifies stuck points and triggers micro-guidance. Detects churn risk signals early.",metric:"First-value fast"},
  {icon:"\ud83d\udcca",title:"Ops Intelligence",desc:"Daily summaries with concrete KPIs: conversations handled, response times, lead conversions, revenue attribution. Weekly reviews with top objections and KB gaps.",metric:"Daily + weekly"},
];

const FAQS=[
  {q:"What does LOGOFF actually do?",a:"LOGOFF is an AI agent that runs your customer operations: support tickets, sales qualification, user onboarding, and KPI reporting \u2014 all autonomously."},
  {q:"How does it connect to my tools?",a:"Integrates with Zendesk, Intercom, Freshdesk, HubSpot, Pipedrive, Salesforce, Google Calendar, Calendly, Notion, Confluence, GitBook, and Slack."},
  {q:"What happens when it cannot handle something?",a:"LOGOFF escalates cleanly with a handoff packet: summary, customer sentiment, facts/timeline, paste-ready recommended reply, and next internal action."},
  {q:"Is my customer data safe?",a:"Privacy-first. LOGOFF never stores personal data in its memory. Uses ticket IDs only. Customer records live in your CRM."},
  {q:"How does early access work?",a:`Pay $149 USDC on Base (wallet connect) or Solana (manual transfer). DM or email your tx hash. We manually onboard within 24 hours. ${CFG.refundDays}-day refund if we cannot activate for your stack.`},
  {q:"How long until LOGOFF is active?",a:"After payment confirmation and manual onboarding, typically within 24-48 hours. Self-serve onboarding is coming soon."},
  {q:"What if I need custom workflows?",a:"Early access includes personal onboarding support. For enterprise needs, reach out via @LogoffAnon on X."},
];

function Landing({nav}){
  const buyRef=useRef(null);
  const go=id=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
  const goBuy=()=>buyRef.current?.scrollIntoView({behavior:"smooth"});
  return(<>
    <section className="hero">
      <div className="h-label"><span className="p"/>Early Access Open</div>
      <Orb/>
      <h1>Your customer ops,<br/><em>handled.</em></h1>
      <p className="h-sub">LOGOFF is an AI agent that runs your support, qualifies your leads, and onboards your users. 24/7. No hiring. No training.</p>
      <p className="h-tag">Early access {"\u00b7"} $149 / 30 days USDC {"\u00b7"} Base + Solana {"\u00b7"} Automated by @LogSocrates</p>
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
      <PurchaseBox onEarlyAccess={()=>nav("early-access")}/>
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

  const connect=async(chain,method)=>{
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
          <button className="w-opt" onClick={()=>connect("evm")} disabled={!wallets.hasEVM}><div className="w-icon mm">M</div>MetaMask<span className={`w-det ${wallets.hasMetaMask?"ok":"no"}`}>{wallets.hasMetaMask?"detected":"install"}</span></button>
          <button className="w-opt" onClick={()=>connect("evm")} disabled={!wallets.hasEVM}><div className="w-icon cb">C</div>Coinbase Wallet<span className={`w-det ${wallets.hasCoinbase?"ok":"no"}`}>{wallets.hasCoinbase?"detected":"install"}</span></button>
          {wallets.hasEVM&&!wallets.hasMetaMask&&!wallets.hasCoinbase&&<button className="w-opt" onClick={()=>connect("evm")}><div className="w-icon wc">W</div>Other Wallet<span className="w-det ok">detected</span></button>}
        </div>}
        {ws==="idle"&&tab==="solana"&&<div className="wallet-grid">
          <button className="w-opt" onClick={()=>connect("solana")} disabled={!wallets.hasPhantom}><div className="w-icon" style={{background:"linear-gradient(135deg,#ab9ff2,#7b6fe0)"}}>P</div>Phantom<span className={`w-det ${wallets.hasPhantom?"ok":"no"}`}>{wallets.hasPhantom?"detected":"install"}</span></button>
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
  const[wallet,setWallet]=useState(()=>loadWalletSession()); // {chain, addr, isDev, key} | null

  const nav=p=>{setPage(p);setMobOpen(false);window.scrollTo(0,0)};
  const goSection=id=>{nav("home");setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"}),100)};

  const isConnected=!!wallet?.addr;
  const isDev=!!wallet?.isDev;

  const handleConnect=(chain,addr)=>{
    const s=saveWalletSession(chain,addr);
    setWallet(s);
    setShowLogin(false);
  };

  const handleDisconnect=()=>{
    clearWalletSession();
    setWallet(null);
    if(page==="preview") nav("home");
  };

  // Guard: preview requires dev wallet
  useEffect(()=>{if(page==="preview"&&!isDev) nav("home")},[page,isDev]);

  const NL=(label,action)=><button className="nl" onClick={action}>{label}</button>;

  // Render nav items helper (reused for desktop + mobile)
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
      : NL("Login",()=>setShowLogin(true))
    }
    <button className={mobile?"nb":"nb"} style={mobile?{marginTop:8}:{}} onClick={()=>goSection("buy")}>{"$149 \u2192"}</button>
  </>;

  return(<>
    <style>{CSS}</style>
    <div style={{minHeight:"100vh"}}>
      <nav className="nav">
        <div className="nav-b" onClick={()=>nav("home")}>LOG<span>OFF</span></div>
        <div className="nav-r">{renderNavItems(false)}</div>
        <button className="burger" onClick={()=>setMobOpen(!mobOpen)}>{mobOpen?"\u2715":"\u2630"}</button>
      </nav>
      <div className={`mob-menu ${mobOpen?"open":""}`}>{renderNavItems(true)}</div>

      <div className="page-wrap">
        {page==="home"&&<Landing nav={nav}/>}
        {page==="early-access"&&<EarlyAccessPage goBuy={()=>goSection("buy")}/>}
        {page==="preview"&&isDev&&<DevPreviewPage devSession={wallet} onDisconnect={handleDisconnect}/>}
      </div>

      {page==="home"&&<WidgetDemo/>}
      {showLogin&&<WalletModal onClose={()=>setShowLogin(false)} onConnect={handleConnect}/>}

      <footer className="foot"><div className="fb">LOG<span>OFF</span></div>
        <div className="fls">
          <button className="fl" onClick={()=>nav("early-access")}>Early Access</button>
          {isDev&&<button className="fl" onClick={()=>nav("preview")}>Preview</button>}
          <button className="fl">@LogoffAnon</button>
          <button className="fl">@LogSocrates</button>
          <button className="fl">LOGOFF Club</button>
        </div>
      </footer>
      <div className="fbot">Automated by @LogSocrates</div>
    </div>
  </>);
}
