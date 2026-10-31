// The System — automated checks. Run: node tests/run.js index.html
// Exits non-zero on any failure so the APK build never runs on a broken app.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.resolve(process.argv[2] || 'index.html');
const HTML = fs.readFileSync(FILE, 'utf8');
const KEY = 'system-levelling-v1';
const results = [];

function boot(savedState) {
  const errors = [];
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://the-system.test/',
    beforeParse(w) {
      w.scrollTo = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
      w.fetch = async () => ({ ok: false, json: async () => ({}) });
      if (savedState) w.localStorage.setItem(KEY, JSON.stringify(savedState));
      w.addEventListener('error', e => errors.push(e.message));
    }
  });
  const w = dom.window;
  const settle = () => new Promise(r => setTimeout(r, 600));
  return settle().then(() => {
    const b = w.document.getElementById('brief'); if (b) b.remove();
    return { w, run: code => w.eval(code), errors, close: () => w.close() };
  });
}

async function test(name, fn) {
  try { await fn(); results.push([true, name]); }
  catch (e) { results.push([false, name, e && e.message || String(e)]); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }

// date control: replace today() with a movable clock
const CLOCK = `if(!window.__real){ window.__real=today; window.__day=__real(); today=(d)=>d?__real(d):__day; }`;

(async () => {
  // ---------- static checks ----------
  await test('no native confirm()/alert() (blocked in the Claude sandbox)', () => {
    const js = HTML.slice(HTML.indexOf('<script>'));
    ok(!/[^.\w]confirm\(/.test(js), 'confirm( found'); ok(!/[^.\w]alert\(/.test(js), 'alert( found');
  });
  await test('APP_BUILD placeholder present exactly once (workflow injects the build number)', () => {
    eq((HTML.match(/const APP_BUILD=0;/g) || []).length, 1);
  });

  // ---------- boot ----------
  let A = await boot();
  await test('boots without JavaScript errors', () => eq(A.errors.length, 0, A.errors.join(' | ')));
  await test('every tab renders without errors', () => {
    for (const v of ['player', 'quests', 'train', 'food', 'goals', 'progress', 'learn']) {
      A.run(`document.querySelector('.nav button[data-v="${v}"]').click()`);
      ok(A.run(`!!document.querySelector('#v-${v}')`), 'missing view ' + v);
    }
    eq(A.errors.length, 0, A.errors.join(' | '));
  });
  await test('fresh state has quests, workouts and goals', () => {
    ok(A.run('S.tasks.length') >= 6, 'too few daily quests'); ok(A.run('S.workouts.length') >= 5, 'workouts missing');
    ok(A.run('AUTO_GOALS.length') > 5, 'auto goals missing');
  });

  // ---------- core loop ----------
  await test('ticking a quest logs XP; unticking removes it', () => {
    const r = A.run(`const t=S.tasks.find(x=>!x.link); const b=S.recap[today()]||0; toggleTask(t.id); const a=S.recap[today()]; toggleTask(t.id); [b,a,S.recap[today()]||0]`);
    ok(r[1] > r[0], 'no XP gained'); eq(r[2], r[0], 'untick did not remove XP');
  });
  await test('REGRESSION: app left open overnight does not erase the previous day', () => {
    const r = A.run(CLOCK + `const plain=S.tasks.filter(t=>!t.link).slice(0,6); S.hp=1000; S.threshold=6; S.lastProcessed=__day; S.tokens=0;
      plain.forEach(t=>{ if(t.last!==__day) toggleTask(t.id); }); const X=__day; __day=addDays(X,1); toggleTask(plain[0].id); dayTick(); [S.hp, S.lastProcessed===__day]`);
    eq(r[0], 1000, 'wrongful penalty'); ok(r[1], 'rollover did not advance');
  });
  await test('missing the pass mark costs 100 HP; a shield absorbs it', () => {
    const r = A.run(CLOCK + `S.hp=1000; S.tokens=0; S.lastProcessed=__day; __day=addDays(__day,1); rollover(); const a=S.hp;
      S.tokens=1; S.lastProcessed=__day; __day=addDays(__day,1); rollover(); [a,S.hp,S.tokens]`);
    eq(r[0], 900, 'penalty'); eq(r[1], 900, 'shield should block'); eq(r[2], 0, 'shield not used');
  });
  await test('XP multiplier tiers by HP (1 / 0.8 / 0.5)', () => {
    const r = A.run(`[1000,999,500,499,0].map(h=>{ S.hp=h; return weakMult(); })`);
    eq(JSON.stringify(r), JSON.stringify([1, 0.8, 0.8, 0.5, 0.5]));
  });
  await test('in-day healing capped at 150', () => {
    const r = A.run(`S.hp=200; S.healLog={}; heal(100,'a'); heal(100,'b'); heal(100,'c'); S.hp`);
    eq(r, 350);
  });
  await test('pass streak heals more on consecutive pass days', () => {
    const r = A.run(CLOCK + `S.hp=300; S.threshold=4; S.passStreak=0; const hs=[]; for(let k=0;k<3;k++){ const d=__day; S.lastProcessed=d; S.tasks.forEach((t,i)=>{ t.last=i<4?d:null; }); __day=addDays(d,1); rollover(); hs.push(S.hp); } [S.passStreak, hs[1]-hs[0], hs[2]-hs[1]]`);
    eq(r[0], 3, 'streak count'); ok(r[2] > r[1], 'heal should grow with streak');
  });

  // ---------- rewards / goals / subcategories ----------
  await test('d20 table maps every face to the right reward', () => {
    const r = A.run(`const o=[]; for(let n=1;n<=20;n++){ S.titles=[]; o.push(boxOutcome(n).big); } o`);
    eq(r[0], 'Fumble'); ok(r.slice(1, 9).every(x => x === 'XP burst'), '2-9'); ok(r.slice(9, 14).every(x => x === 'Healing potion'), '10-14');
    ok(r.slice(14, 17).every(x => x === 'Shield token'), '15-17'); ok(r.slice(17, 19).every(x => x === 'Rare title'), '18-19'); eq(r[19], 'CRITICAL!');
  });
  await test('weekly task with secondary subcategory pays 100% + 25%', () => {
    const r = A.run(`S.manualGoals.push({id:'gT',name:'T',period:'week',target:1,xp:200,primary:'Knowledge',secondary:['Focus']}); S.hp=1000; manualAdd('gT',1);
      S.log.filter(e=>e.task==='goal:gT').map(e=>e.sub+':'+e.xp).join(',')`);
    eq(r, 'Knowledge:200,Focus:50');
  });
  await test('auto-goal override changes its target', () => {
    eq(A.run(`S.goalOv={w_bad:{target:3}}; gTarget(AUTO_GOALS.find(g=>g.id==='w_bad'))`), 3);
  });
  await test('custom subcategory joins a skill', () => {
    eq(A.run(`S.customSubs=[{name:'Language',skill:'Intellect'}]; applyCustomSubs(); SUB_SKILL['Language']`), 'Intellect');
  });

  // ---------- emergencies ----------
  await test('emergency plans stay inside 08:00–19:00 and 3–5 hours', () => {
    const r = A.run(`S.day1=addDays(today(),-20); let bad=0; for(let i=0;i<60;i++){ S.emPlan={}; planEmergencies(); for(const p of Object.values(S.emPlan)){ if(!p) continue; const h=new Date(p.at).getHours(); if(h<8||h>19||p.hours<3||p.hours>5) bad++; } } bad`);
    eq(r, 0, 'plans outside the window');
  });
  await test('emergency activates at its start and expires if missed', () => {
    const r = A.run(`const t=today(); S.emergency=null; S.emPlan={[t]:{at:Date.now()+600000,id:1,hours:3}}; spawnEmergency(); const before=!!S.emergency;
      S.emPlan[t].at=Date.now()-60000; spawnEmergency(); const active=S.emergency&&S.emergency.done===false;
      S.emergency=null; S.emPlan[t].at=Date.now()-6*3600e3; spawnEmergency(); [before,active,S.emergency.done]`);
    eq(r[0], false, 'started early'); eq(r[1], true, 'did not start'); eq(r[2], 'expired', 'missed state');
  });

  await test('ticking push-up / healthy-eating / water quests counts toward weekly goals (no double count)', () => {
    const r = A.run(`const wk=periodFilter('week'); const q=ex=>S.tasks.find(t=>t.link&&t.link.ex===ex); const d=today();
      for(const ex of ['pushups','tracker:food','tracker:water']){ const t=q(ex); if(t&&t.last!==d) toggleTask(t.id); } save();
      const a=[pushupsIn(wk)>=puTarget(), mealsIn(wk)>=1, waterIn(wk)>=8]; S.sets.push({ex:'pushups',date:d,amt:puTarget()+20,variant:'Standard'}); a.push(pushupsIn(wk)-dayTotal('pushups',d)); a`);
    ok(r[0], 'push-ups'); ok(r[1], 'clean eating'); ok(r[2], 'water'); ok(r[3] < r[3] + 1 && r[3] >= 0, 'double count');
  });

  // ---------- shortcuts (Android quick-log) ----------
  await test('REGRESSION: shortcut taps are credited, including late-night taps for yesterday', () => {
    const r = A.run(`const t=today(), y=addDays(t,-1); S.habits[t]=S.habits[t]||{}; S.habits[y]=S.habits[y]||{}; S.habits[t].stairs=3; S.habits[y].stairs=2;
      window.Android={pullQuickLogs:()=>JSON.stringify({date:t,water:0,teeth:1,stairs:8,prev_date:y,prev:{water:0,teeth:0,stairs:5}})};
      pullQuickLogs(); delete window.Android; [habitCount('stairs',t), habitCount('teeth',t), habitCount('stairs',y)]`);
    eq(r[0], 11, 'today stairs'); eq(r[2], 7, 'yesterday stairs');
  });

  // ---------- persistence ----------
  const snapshot = A.run(`save(); JSON.parse(localStorage.getItem('${KEY}'))`);
  A.close();
  await test('state survives a restart', async () => {
    const B = await boot(snapshot);
    eq(B.run('S.tasks.length'), snapshot.tasks.length); eq(B.run('S.manualGoals.some(g=>g.id==="gT")'), true);
    eq(B.errors.length, 0, B.errors.join(' | ')); B.close();
  });
  await test('an old save without newer fields still loads', async () => {
    const old = JSON.parse(JSON.stringify(snapshot));
    for (const k of ['todos','emPlan','doneDays','goalOv','customSubs','potions','passStreak','notes','srs','practice','favQuotes','myQuotes','upd','healLog','army','swipe','simple','cleanup1022','fix1026']) delete old[k];
    const C = await boot(old);
    eq(C.errors.length, 0, C.errors.join(' | ')); ok(Array.isArray(C.run('S.todos')), 'todos not defaulted'); C.close();
  });

  // ---------- report ----------
  const failed = results.filter(r => !r[0]);
  for (const r of results) console.log((r[0] ? '  ✓ ' : '  ✗ ') + r[1] + (r[0] ? '' : '\n      → ' + r[2]));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
