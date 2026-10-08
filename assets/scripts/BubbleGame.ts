import { _decorator, Component, Node, Graphics, Label, Vec3, view, tween } from 'cc';

const { ccclass } = _decorator;

type Kind = 'red' | 'yellow' | 'blue' | 'green' | 'bomb' | 'stone' | 'clone';
type Mode = 'bomb' | 'stone' | 'clone';

const NORMAL: Kind[] = ['red', 'yellow', 'blue', 'green'];
const COLORS: Record<Kind, string> = {
  red: '#F45B69', yellow: '#F7C948', blue: '#4D96FF', green: '#55C271',
  bomb: '#263238', stone: '#8E98A3', clone: '#6C63FF'
};
const R = 20;
const COLS = 10;
const ROWS = 12;
const DX = 41;
const DY = 35;
const LEFT = -184;
const TOP = 255;
const SHOOT_Y = -280;

interface Ball {
  node: Node;
  kind: Kind;
  row: number;
  col: number;
  alive: boolean;
}

interface LevelDef {
  id: number;
  name: string;
  mode: Mode;
  specials: [number, number][];
  goal: string;
}

// Mirrors assets/levels/levels.json — kept in code so the prototype still runs
// without a resources bundle. Edit levels.json first, then sync this table.
const LEVELS: LevelDef[] = [
  { id: 1, name: 'Bomb Intro', mode: 'bomb', specials: [[3, 3]], goal: 'Make one safe bomb shot.' },
  { id: 2, name: 'Double Burst', mode: 'bomb', specials: [[3, 3], [4, 7]], goal: 'Choose the higher-value explosion.' },
  { id: 3, name: 'Stone Gate', mode: 'stone', specials: [[3, 3], [3, 4], [3, 5], [3, 6]], goal: 'Find a route around the barrier.' },
  { id: 4, name: 'Bank Shot', mode: 'stone', specials: [[3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7]], goal: 'Use wall bounce to reach the opening.' },
  { id: 5, name: 'Clone Intro', mode: 'clone', specials: [[4, 4]], goal: 'Clone into a useful color cluster.' },
  { id: 6, name: 'Save or Spend', mode: 'clone', specials: [[4, 4], [5, 7]], goal: 'Hold the clone until its value increases.' },
  { id: 7, name: 'Burst + Route', mode: 'bomb', specials: [[3, 2], [3, 7]], goal: 'Open the board with minimal shots.' },
  { id: 8, name: 'Stone + Clone', mode: 'clone', specials: [[3, 4], [4, 4]], goal: 'Create a cluster through constrained space.' },
  { id: 9, name: 'Chain Test', mode: 'bomb', specials: [[2, 3], [3, 6], [5, 5]], goal: 'Build a combo from one deliberate detonation.' },
  { id: 10, name: 'Design Review', mode: 'clone', specials: [[3, 2], [3, 3], [3, 6], [4, 6]], goal: 'Balance route, timing and payoff in one board.' }
];

@ccclass('BubbleGame')
export class BubbleGame extends Component {
  private root!: Node;
  private board!: Node;
  private aim!: Graphics;
  private launcher!: Graphics;
  private focus!: Graphics;
  private fx!: Graphics;
  private hint!: Label;
  private scoreLabel!: Label;
  private comboLabel!: Label;
  private balls: Ball[] = [];
  private map = new Map<string, Ball>();
  private shooter: Kind = 'red';
  private nextShooter: Kind = 'blue';
  private angle = Math.PI / 2;
  private aiming = false;
  private shotActive = false;
  private shotNode: Node | null = null;
  private shotX = 0;
  private shotY = SHOOT_Y;
  private shotVX = 0;
  private shotVY = 0;
  private score = 0;
  private combo = 0;
  private levelIndex = 0;
  private level = 1;
  private cleared = false;
  private reservedClone = false;
  private modeButtons: Node[] = [];
  private toast!: Label;
  private levelLabel!: Label;
  private lastShotTime = 0;

  start() { this.buildUI(); this.reset(); }

  update(dt: number) {
    if (!this.shotActive || !this.shotNode) return;
    this.shotX += this.shotVX * dt * 60;
    this.shotY += this.shotVY * dt * 60;
    if (this.shotX < -235 || this.shotX > 235) {
      this.shotX = Math.max(-235, Math.min(235, this.shotX));
      this.shotVX *= -1;
    }
    this.shotNode.position = new Vec3(this.shotX, this.shotY);
    const hit = this.balls.find(b => b.alive && Math.hypot(this.xOf(b.row, b.col) - this.shotX, this.yOf(b.row) - this.shotY) < 35);
    if (hit || this.shotY >= TOP + 15) this.finishShot(hit ?? null);
  }

  private buildUI() {
    this.root = new Node('BubbleCasualLab'); this.node.addChild(this.root);
    const bg = new Node('Background'); const bgG = bg.addComponent(Graphics);
    bgG.fillColor.fromHEX('#F5F7FA'); bgG.rect(-260, -350, 520, 700); bgG.fill(); this.root.addChild(bg);
    this.board = new Node('Board'); this.root.addChild(this.board);

    const panel = new Node('Panel'); const pg = panel.addComponent(Graphics);
    pg.fillColor.fromHEX('#FFFFFF'); pg.roundRect(-238, -305, 476, 610, 18); pg.fill();
    pg.strokeColor.fromHEX('#E5E7EB'); pg.lineWidth = 1; pg.roundRect(-238, -305, 476, 610, 18); pg.stroke();
    this.root.addChild(panel);

    this.label('Title', 'Bubble Casual Lab', 0, 322, 20, '#111827');
    this.hint = this.makeLabel('Hint', 0, 298, 11, '#667085'); this.root.addChild(this.hint.node);
    this.scoreLabel = this.makeLabel('Score', -180, 322, 11, '#475467'); this.root.addChild(this.scoreLabel.node);
    this.comboLabel = this.makeLabel('Combo', 175, 322, 11, '#475467'); this.root.addChild(this.comboLabel.node);

    this.modeButtons = [
      this.button('BOMB', -145, 270, () => this.jumpToMode('bomb')),
      this.button('STONE', 0, 270, () => this.jumpToMode('stone')),
      this.button('CLONE', 145, 270, () => this.jumpToMode('clone'))
    ];
    this.toast = this.makeLabel('Toast', 0, -245, 11, '#344054'); this.toast.string = 'AIM · DRAG · RELEASE'; this.root.addChild(this.toast.node);
    this.button('RESTART', 0, -325, () => this.reset());
    this.button('HOLD', 150, -285, () => this.holdClone());
    this.button('◀ PREV', -150, -325, () => this.switchLevel(-1));
    this.button('NEXT ▶', 150, -325, () => this.switchLevel(1));
    this.levelLabel = this.makeLabel('Level', -180, 298, 10, '#475467'); this.root.addChild(this.levelLabel.node);

    this.aim = this.root.addComponent(Graphics);
    this.launcher = this.root.addComponent(Graphics);
    this.focus = this.root.addComponent(Graphics);
    this.fx = this.root.addComponent(Graphics);
    this.root.on(Node.EventType.TOUCH_START, this.pointer, this);
    this.root.on(Node.EventType.TOUCH_MOVE, this.pointer, this);
    this.root.on(Node.EventType.TOUCH_END, this.shoot, this);
    this.startLauncherBreathing();
  }

  private makeLabel(name: string, x: number, y: number, size: number, hex: string) {
    const n = new Node(name); const l = n.addComponent(Label);
    l.fontSize = size; l.color.fromHEX(hex); n.position = new Vec3(x, y); return l;
  }
  private label(name: string, text: string, x: number, y: number, size: number, hex: string) {
    const l = this.makeLabel(name, x, y, size, hex); l.string = text; this.root.addChild(l.node); return l;
  }
  private button(text: string, x: number, y: number, fn: () => void) {
    const n = new Node(text); const g = n.addComponent(Graphics);
    g.fillColor.fromHEX('#FFFFFF'); g.roundRect(-55, -16, 110, 32, 8); g.fill();
    g.strokeColor.fromHEX('#D0D5DD'); g.lineWidth = 1; g.roundRect(-55, -16, 110, 32, 8); g.stroke();
    const l = n.addComponent(Label); l.string = text; l.fontSize = 11; l.color.fromHEX('#344054');
    n.position = new Vec3(x, y); this.root.addChild(n); n.on(Node.EventType.TOUCH_END, (e: any) => { e.propagationStopped = true; this.buttonPulse(n); fn(); }); return n;
  }

  private buttonPulse(n: Node) {
    n.setScale(0.94, 0.94, 1);
    this.scheduleOnce(() => n.setScale(1, 1, 1), 0.09);
  }

  private startLauncherBreathing() {
    tween(this.launcher)
      .repeatForever(
        tween().sequence(
          tween().to(0.9, { scale: new Vec3(1.035, 1.035, 1) }),
          tween().to(0.9, { scale: new Vec3(1, 1, 1) })
        )
      )
      .start();
  }

  private jumpToMode(mode: Mode) {
    const idx = LEVELS.findIndex(l => l.mode === mode);
    if (idx < 0 || idx === this.levelIndex) return;
    this.levelIndex = idx; this.reset();
  }

  private switchLevel(dir: number) {
    const idx = Math.max(0, Math.min(LEVELS.length - 1, this.levelIndex + dir));
    if (idx === this.levelIndex) return;
    this.levelIndex = idx; this.reset();
  }

  private reset() {
    const def = LEVELS[this.levelIndex];
    this.level = def.id; this.cleared = false;
    this.balls.forEach(b => b.node.destroy()); this.balls = []; this.map.clear();
    this.score = 0; this.combo = 0; this.reservedClone = false; this.shotActive = false;
    this.focus.clear(); this.fx.clear();
    this.hint.string = `${def.name.toUpperCase()} · ${def.goal}`;
    this.levelLabel.string = `LV ${def.id}/${LEVELS.length} · ${def.name}`;
    this.scoreLabel.string = 'SCORE 0000'; this.comboLabel.string = 'COMBO x0';
    this.toast.string = 'AIM · DRAG · RELEASE';
    for (let r = 0; r < 7 + Math.floor(this.levelIndex / 3); r++) {
      for (let c = 0; c < COLS; c++) this.addBall(this.initial(r, c), r, c);
    }
    this.shooter = def.mode === 'bomb' ? 'bomb' : def.mode === 'clone' ? 'clone' : NORMAL[0];
    this.nextShooter = NORMAL[1];
    this.drawLauncher(); this.drawAim(); this.animateBoardIn(); this.updateHud();
  }

  private animateBoardIn() {
    this.balls.forEach((b, i) => {
      b.node.setScale(0.72, 0.72, 1);
      tween(b.node)
        .delay(0.012 * i)
        .to(0.16, { scale: new Vec3(1.08, 1.08, 1) })
        .to(0.12, { scale: new Vec3(1, 1, 1) })
        .start();
    });
  }

  private initial(r: number, c: number): Kind {
    const def = LEVELS[this.levelIndex];
    if (def.specials.some(([sr, sc]) => sr === r && sc === c)) return def.mode;
    return NORMAL[(r * 2 + c + this.levelIndex) % NORMAL.length];
  }

  private key(r: number, c: number) { return `${r}:${c}`; }
  private xOf(r: number, c: number) { return LEFT + c * DX + (r % 2 ? DX / 2 : 0); }
  private yOf(r: number) { return TOP - r * DY; }

  private neighbors(r: number, c: number) {
    const even = r % 2 === 0;
    const ds = even
      ? [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]]
      : [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
    return ds.map(([dr, dc]) => [r + dr, c + dc] as [number, number])
      .filter(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS);
  }

  private addBall(kind: Kind, r: number, c: number, animated = false) {
    const old = this.map.get(this.key(r, c)); if (old?.alive) return old;
    const n = new Node(kind); const g = n.addComponent(Graphics);
    g.fillColor.fromHEX(COLORS[kind]); g.circle(0, 0, R); g.fill();
    g.strokeColor.fromHEX('#FFFFFF'); g.lineWidth = 1.5; g.circle(0, 0, R - 1); g.stroke();
    if (kind === 'bomb') {
      g.strokeColor.fromHEX('#FFFFFF'); g.lineWidth = 3;
      g.moveTo(-8,-8); g.lineTo(8,8); g.moveTo(-8,8); g.lineTo(8,-8); g.stroke();
    }
    if (kind === 'clone') {
      g.strokeColor.fromHEX('#FFFFFF'); g.lineWidth = 3;
      g.moveTo(-8,0); g.lineTo(8,0); g.moveTo(0,-8); g.lineTo(0,8); g.stroke();
    }
    if (kind === 'stone') { g.fillColor.fromHEX('#667085'); g.circle(0,0,5); g.fill(); }
    n.position = new Vec3(this.xOf(r,c), this.yOf(r)); this.board.addChild(n);
    const b = { node:n, kind, row:r, col:c, alive:true }; this.balls.push(b); this.map.set(this.key(r,c), b);
    if (animated) {
      n.setScale(0.1, 0.1, 1);
      tween(n).to(0.12, { scale: new Vec3(1.22, 1.22, 1) }).to(0.12, { scale: new Vec3(1, 1, 1) }).start();
    }
    return b;
  }

  private pointer(e: any) {
    if (this.shotActive) return;
    const p = e.getUILocation(); const size = view.getVisibleSize();
    const x = p.x - size.width / 2, y = p.y - size.height / 2;
    this.angle = Math.atan2(y - SHOOT_Y, x);
    this.angle = Math.max(0.28, Math.min(Math.PI - 0.28, this.angle));
    this.drawAim(); this.drawFocus(true); this.aiming = true; this.toast.string = 'RELEASE · FIRE';
  }

  private drawAim() {
    this.aim.clear(); this.aim.strokeColor.fromHEX('#98A2B3'); this.aim.lineWidth = 2;
    let x = 0, y = SHOOT_Y, vx = Math.cos(this.angle) * 7, vy = Math.sin(this.angle) * 7;
    this.aim.moveTo(x,y);
    for (let i=0;i<90;i++) {
      x += vx; y += vy;
      if (x < -235 || x > 235) { vx *= -1; x = Math.max(-235, Math.min(235, x)); }
      if (i % 3 === 0) this.aim.lineTo(x,y);
      if (y > TOP + 10) break;
    }
    this.aim.stroke();
  }

  private drawFocus(active: boolean) {
    this.focus.clear();
    if (!active || !['bomb', 'clone'].includes(this.shooter)) return;
    this.focus.strokeColor.fromHEX(this.shooter === 'bomb' ? '#344054' : '#6C63FF');
    this.focus.lineWidth = 2;
    this.focus.circle(0, SHOOT_Y, 29);
    this.focus.stroke();
  }

  private shoot() {
    if (!this.aiming || this.shotActive) return;
    this.aiming = false; this.aim.clear(); this.drawFocus(false); this.shotActive = true; this.lastShotTime = Date.now(); this.toast.string = 'SHOT IN FLIGHT';
    this.shotX = 0; this.shotY = SHOOT_Y; this.shotVX = Math.cos(this.angle) * 7; this.shotVY = Math.sin(this.angle) * 7;
    this.shotNode = new Node('Shot'); const g = this.shotNode.addComponent(Graphics);
    g.fillColor.fromHEX(COLORS[this.shooter]); g.circle(0,0,R); g.fill(); this.root.addChild(this.shotNode);
    tween(this.shotNode).to(0.08, { scale: new Vec3(1.12, 1.12, 1) }).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
  }

  private finishShot(hit: Ball | null) {
    if (!this.shotNode) return;
    this.shotNode.destroy(); this.shotNode = null; this.shotActive = false;
    if (hit?.kind === 'stone') this.stoneHit(hit);
    const target = this.findAttachCell(this.shotX, this.shotY, hit);
    if (!target) { this.drawLauncher(); return; }
    const placed = this.addBall(this.shooter, target[0], target[1], true);
    if (this.shooter === 'bomb') this.explode(placed);
    else if (this.shooter === 'clone') this.clone(placed);
    else this.resolveMatch(placed);
    this.shooter = this.reservedClone ? 'clone' : this.nextShooter;
    this.reservedClone = false;
    this.nextShooter = NORMAL[(this.score + this.level) % NORMAL.length];
    this.drawLauncher(); this.updateHud(); this.toast.string = this.combo > 0 ? `COMBO x${this.combo} · NICE` : 'AIM · DRAG · RELEASE';
  }

  private findAttachCell(x:number, y:number, hit:Ball|null): [number,number] | null {
    const dist = (rc:[number,number]) => Math.hypot(this.xOf(rc[0],rc[1]) - x, this.yOf(rc[0]) - y);
    let candidates:[number,number][] = [];
    if (hit) {
      candidates = this.neighbors(hit.row, hit.col)
        .filter(([r,c]) => !this.map.get(this.key(r,c))?.alive);
    }
    if (!candidates.length) {
      // Fallback (e.g. ceiling hit with row 0 occupied): pick the nearest free
      // cell so the shot always lands somewhere valid instead of vanishing.
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!this.map.get(this.key(r,c))?.alive) candidates.push([r,c]);
        }
      }
      if (!candidates.length) return null;
    }
    candidates.sort((a,b) => dist(a) - dist(b));
    return candidates[0];
  }

  private resolveMatch(center:Ball) {
    if (!NORMAL.includes(center.kind)) return;
    const cluster = this.sameColorCluster(center);
    if (cluster.length < 3) { this.combo = 0; return; }
    cluster.forEach((b, i) => this.remove(b, 0.045 * i));
    this.combo++; this.score += cluster.length * 10 * this.combo;
    const pts = cluster.length * 10 * this.combo;
    this.dropUnsupported(); this.flash(this.xOf(center.row,center.col),this.yOf(center.row)); this.comboBurst(cluster.length, pts, this.xOf(center.row, center.col), this.yOf(center.row)); this.updateHud();
  }

  private sameColorCluster(start:Ball) {
    const out:Ball[]=[]; const seen=new Set<string>(); const q=[start];
    while(q.length) {
      const b=q.shift()!; const k=this.key(b.row,b.col); if(seen.has(k))continue; seen.add(k);
      if(!b.alive || b.kind!==start.kind)continue; out.push(b);
      for(const [r,c] of this.neighbors(b.row,b.col)) {
        const n=this.map.get(this.key(r,c));
        if(n?.alive&&!seen.has(this.key(r,c)))q.push(n);
      }
    }
    return out;
  }

  private explode(center:Ball) {
    const targets=this.balls.filter(b=>b.alive && Math.hypot(b.row-center.row,b.col-center.col)<=1.45 && b!==center && b.kind!=='stone');
    this.shockwave(this.xOf(center.row,center.col), this.yOf(center.row));
    targets.forEach((b, i) => {
      this.shakeNode(b.node, 0.07, 0.045 * i);
      this.remove(b, 0.08 + 0.035 * i);
    });
    this.remove(center, 0.02);
    this.combo++; const pts = (targets.length+1)*15*this.combo; this.score += pts;
    this.dropUnsupported(); this.flash(this.xOf(center.row,center.col),this.yOf(center.row)); this.comboBurst(targets.length + 1, pts, this.xOf(center.row,center.col), this.yOf(center.row)); this.updateHud();
  }

  private clone(center:Ball) {
    const candidates=this.neighbors(center.row,center.col).map(([r,c])=>this.map.get(this.key(r,c)))
      .filter((b): b is Ball=>!!b&&b.alive&&NORMAL.includes(b.kind));
    const source=candidates[0];
    if(!source){this.remove(center, 0.05);return;}
    const empty=this.neighbors(center.row,center.col).filter(([r,c])=>!this.map.get(this.key(r,c))?.alive).slice(0,2);
    this.cloneCharge(center);
    this.scheduleOnce(() => {
      empty.forEach(([r,c], i) => {
        const clone = this.addBall(source.kind,r,c,true);
        this.popOut(clone.node, center.node.position, 0.12 * i);
      });
      this.remove(center, 0.03);
      this.combo++; const pts = empty.length*12*this.combo; this.score += pts; this.comboBurst(empty.length, pts, this.xOf(center.row,center.col), this.yOf(center.row)); this.updateHud();
    }, 0.16);
  }

  private holdClone() {
    if(this.shotActive || this.shooter!=='clone') return;
    this.reservedClone=true; this.shooter=this.nextShooter; this.nextShooter='clone';
    this.hint.string='CLONE 已保存 · 先处理当前局面，再决定何时释放'; this.drawLauncher(); this.drawFocus(false);
  }

  private dropUnsupported() {
    const alive=this.balls.filter(b=>b.alive); const connected=new Set<string>(); const q=alive.filter(b=>b.row===0);
    q.forEach(b=>connected.add(this.key(b.row,b.col)));
    while(q.length) {
      const b=q.shift()!;
      for(const [r,c] of this.neighbors(b.row,b.col)) {
        const n=this.map.get(this.key(r,c));
        if(n?.alive&&!connected.has(this.key(r,c))){connected.add(this.key(r,c));q.push(n);}
      }
    }
    alive.filter(b=>b.kind!=='stone'&&!connected.has(this.key(b.row,b.col))).forEach((b, i)=>{this.remove(b, 0.08 + i * 0.025);this.score+=5;});
  }

  private remove(b:Ball, delay = 0) {
    if (!b.alive) return;
    b.alive=false; this.map.delete(this.key(b.row,b.col));
    const n = b.node;
    tween(n)
      .delay(delay)
      .to(0.07, { scale: new Vec3(1.12, 1.12, 1) })
      .to(0.12, { scale: new Vec3(0.05, 0.05, 1) })
      .call(() => { if (n.isValid) n.destroy(); })
      .start();
  }

  private stoneHit(stone:Ball) {
    this.shakeNode(stone.node, 0, 0.02);
    this.hitRing(this.xOf(stone.row,stone.col), this.yOf(stone.row));
    this.toast.string = 'STONE HIT · BLOCKED';
  }

  private shakeNode(n:Node, duration=0.08, delay=0) {
    const base = n.position.clone();
    tween(n)
      .delay(delay)
      .to(duration / 3, { position: new Vec3(base.x + 4, base.y, base.z) })
      .to(duration / 3, { position: new Vec3(base.x - 4, base.y, base.z) })
      .to(duration / 3, { position: base })
      .start();
  }

  private popOut(n:Node, from:Vec3, delay=0) {
    const target = n.position.clone();
    n.setPosition(from);
    tween(n).delay(delay).to(0.18, { position: target, scale: new Vec3(1.15,1.15,1) })
      .to(0.09, { scale: new Vec3(1,1,1) }).start();
  }

  private cloneCharge(center:Ball) {
    tween(center.node).to(0.07, { scale: new Vec3(1.18,1.18,1) })
      .to(0.07, { scale: new Vec3(0.82,0.82,1) })
      .to(0.07, { scale: new Vec3(1.2,1.2,1) }).start();
    this.hitRing(this.xOf(center.row,center.col), this.yOf(center.row));
  }

  private shockwave(x:number,y:number) {
    const n = new Node('BombShockwave'); const g = n.addComponent(Graphics);
    g.strokeColor.fromHEX('#263238'); g.lineWidth = 4; g.circle(0,0,16); g.stroke();
    n.position = new Vec3(x,y); this.root.addChild(n);
    tween(n).to(0.2, { scale: new Vec3(3.2,3.2,1) }).call(()=>n.destroy()).start();
  }

  private hitRing(x:number,y:number) {
    const n = new Node('HitRing'); const g = n.addComponent(Graphics);
    g.strokeColor.fromHEX('#98A2B3'); g.lineWidth = 2; g.circle(0,0,14); g.stroke();
    n.position = new Vec3(x,y); this.root.addChild(n);
    tween(n).to(0.16, { scale: new Vec3(1.8,1.8,1) }).call(()=>n.destroy()).start();
  }

  private comboBurst(count:number, points:number, x:number, y:number) {
    this.spawnFloatText(`COMBO x${this.combo}`, x, y + 28, '#111827', 14);
    this.spawnFloatText(`+${points}`, x, y + 5, '#667085', 12);
    if (this.combo >= 2) this.shakeBoard(0.055);
  }

  private spawnFloatText(textValue:string,x:number,y:number,color:string,size:number) {
    const n = new Node('FloatText'); const l = n.addComponent(Label);
    l.string = textValue; l.fontSize = size; l.color.fromHEX(color);
    n.position = new Vec3(x,y); this.root.addChild(n);
    n.setScale(0.72,0.72,1);
    tween(n).to(0.12, { scale:new Vec3(1,1,1), position:new Vec3(x,y+8,0) })
      .to(0.34, { position:new Vec3(x,y+34,0) })
      .call(()=>n.destroy()).start();
  }

  private shakeBoard(duration:number) {
    const base = this.board.position.clone();
    tween(this.board)
      .to(duration / 4, { position:new Vec3(base.x + 3,base.y,base.z) })
      .to(duration / 4, { position:new Vec3(base.x - 3,base.y,base.z) })
      .to(duration / 4, { position:new Vec3(base.x + 2,base.y,base.z) })
      .to(duration / 4, { position:base }).start();
  }

  private flash(x:number,y:number){
    this.fx.clear(); this.fx.strokeColor.fromHEX('#FFFFFF'); this.fx.lineWidth=4; this.fx.circle(x,y,30); this.fx.stroke();
    this.scheduleOnce(()=>this.fx.clear(),0.12);
  }

  private updateHud(){
    this.scoreLabel.string=`SCORE ${String(this.score).padStart(4,'0')}`;
    this.comboLabel.string=`COMBO x${this.combo}`;
    if (!this.cleared && this.balls.length > 0 && !this.balls.some(b => b.alive)) this.onLevelClear();
  }

  private onLevelClear() {
    this.cleared = true;
    this.score += 100;
    this.scoreLabel.string=`SCORE ${String(this.score).padStart(4,'0')}`;
    this.spawnFloatText('LEVEL CLEAR · +100', 0, 60, '#111827', 16);
    this.toast.string = this.levelIndex < LEVELS.length - 1 ? `LEVEL ${this.level} CLEAR` : 'ALL LEVELS CLEAR';
    this.scheduleOnce(() => {
      if (this.levelIndex < LEVELS.length - 1) { this.levelIndex++; this.reset(); }
      else this.toast.string = 'ALL LEVELS CLEAR · RESTART TO REPLAY';
    }, 1.4);
  }

  private drawLauncher(){
    this.launcher.clear(); this.launcher.fillColor.fromHEX(COLORS[this.shooter]); this.launcher.circle(0,SHOOT_Y,23); this.launcher.fill();
    this.launcher.strokeColor.fromHEX('#FFFFFF'); this.launcher.lineWidth=2; this.launcher.circle(0,SHOOT_Y,17); this.launcher.stroke();
    if(this.shooter==='bomb'){this.launcher.moveTo(-7,SHOOT_Y-7);this.launcher.lineTo(7,SHOOT_Y+7);this.launcher.moveTo(-7,SHOOT_Y+7);this.launcher.lineTo(7,SHOOT_Y-7);this.launcher.stroke();}
    if(this.shooter==='clone'){this.launcher.moveTo(-7,SHOOT_Y);this.launcher.lineTo(7,SHOOT_Y);this.launcher.moveTo(0,SHOOT_Y-7);this.launcher.lineTo(0,SHOOT_Y+7);this.launcher.stroke();}
  }
}
