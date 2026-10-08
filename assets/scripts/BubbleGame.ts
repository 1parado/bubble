import { _decorator, Component, Node, Graphics, Label, Vec3, view } from 'cc';

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

@ccclass('BubbleGame')
export class BubbleGame extends Component {
  private root!: Node;
  private board!: Node;
  private aim!: Graphics;
  private launcher!: Graphics;
  private fx!: Graphics;
  private hint!: Label;
  private scoreLabel!: Label;
  private comboLabel!: Label;
  private balls: Ball[] = [];
  private map = new Map<string, Ball>();
  private mode: Mode = 'bomb';
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
  private level = 1;
  private reservedClone = false;
  private modeButtons: Node[] = [];
  private toast!: Label;
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
      this.button('BOMB', -145, 270, () => this.setMode('bomb')),
      this.button('STONE', 0, 270, () => this.setMode('stone')),
      this.button('CLONE', 145, 270, () => this.setMode('clone'))
    ];
    this.toast = this.makeLabel('Toast', 0, -245, 11, '#344054'); this.toast.string = 'AIM · DRAG · RELEASE'; this.root.addChild(this.toast.node);
    this.button('RESTART', 0, -325, () => this.reset());
    this.button('HOLD', 150, -285, () => this.holdClone());

    this.aim = this.root.addComponent(Graphics);
    this.launcher = this.root.addComponent(Graphics);
    this.fx = this.root.addComponent(Graphics);
    this.root.on(Node.EventType.TOUCH_START, this.pointer, this);
    this.root.on(Node.EventType.TOUCH_MOVE, this.pointer, this);
    this.root.on(Node.EventType.TOUCH_END, this.shoot, this);
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
    n.position = new Vec3(x, y); this.root.addChild(n); n.on(Node.EventType.TOUCH_END, () => { this.buttonPulse(n); fn(); }); return n;
  }

  private buttonPulse(n: Node) {
    n.setScale(0.94, 0.94, 1);
    this.scheduleOnce(() => n.setScale(1, 1, 1), 0.09);
  }

  private setMode(mode: Mode) { this.mode = mode; this.reset(); this.toast.string = `${mode.toUpperCase()} · READY`; this.buttonPulse(this.modeButtons[mode === 'bomb' ? 0 : mode === 'stone' ? 1 : 2]); }

  private reset() {
    this.balls.forEach(b => b.node.destroy()); this.balls = []; this.map.clear();
    this.score = 0; this.combo = 0; this.level = 1; this.reservedClone = false; this.shotActive = false;
    const hints: Record<Mode, string> = {
      bomb: 'BOMB · 用爆炸打开高价值连锁',
      stone: 'STONE · 障碍改变最佳路线',
      clone: 'CLONE · 现在用，还是先保存？'
    };
    this.hint.string = hints[this.mode];
    this.scoreLabel.string = 'SCORE 0000'; this.comboLabel.string = 'COMBO x0';
    for (let r = 0; r < 7 + Math.min(this.level, 3); r++) {
      for (let c = 0; c < COLS; c++) this.addBall(this.initial(r, c), r, c);
    }
    this.shooter = this.mode === 'bomb' ? 'bomb' : this.mode === 'clone' ? 'clone' : NORMAL[0];
    this.nextShooter = NORMAL[1];
    this.drawLauncher(); this.drawAim(); this.animateBoardIn(); this.updateHud();
  }

  private animateBoardIn() {
    this.balls.forEach((b, i) => {
      b.node.setScale(0.72, 0.72, 1);
      this.scheduleOnce(() => { if (b.node.isValid) b.node.setScale(1, 1, 1); }, 0.012 * i);
    });
  }

  private initial(r: number, c: number): Kind {
    if (this.mode === 'bomb' && ((r === 3 && c === 3) || (r === 4 && c === 7))) return 'bomb';
    if (this.mode === 'stone' && ((r === 3 && c >= 2 && c <= 7) || (r === 4 && c === 5))) return 'stone';
    if (this.mode === 'clone' && ((r === 4 && c === 4) || (r === 5 && c === 7))) return 'clone';
    return NORMAL[(r * 2 + c + this.level) % NORMAL.length];
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

  private addBall(kind: Kind, r: number, c: number) {
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
    const b = { node:n, kind, row:r, col:c, alive:true }; this.balls.push(b); this.map.set(this.key(r,c), b); return b;
  }

  private pointer(e: any) {
    if (this.shotActive) return;
    const p = e.getUILocation(); const size = view.getVisibleSize();
    const x = p.x - size.width / 2, y = p.y - size.height / 2;
    this.angle = Math.atan2(y - SHOOT_Y, x);
    this.angle = Math.max(0.28, Math.min(Math.PI - 0.28, this.angle));
    this.drawAim(); this.aiming = true; this.toast.string = 'RELEASE · FIRE';
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

  private shoot() {
    if (!this.aiming || this.shotActive) return;
    this.aiming = false; this.aim.clear(); this.shotActive = true; this.lastShotTime = Date.now(); this.toast.string = 'SHOT IN FLIGHT';
    this.shotX = 0; this.shotY = SHOOT_Y; this.shotVX = Math.cos(this.angle) * 7; this.shotVY = Math.sin(this.angle) * 7;
    this.shotNode = new Node('Shot'); const g = this.shotNode.addComponent(Graphics);
    g.fillColor.fromHEX(COLORS[this.shooter]); g.circle(0,0,R); g.fill(); this.root.addChild(this.shotNode);
  }

  private finishShot(hit: Ball | null) {
    if (!this.shotNode) return;
    this.shotNode.destroy(); this.shotNode = null; this.shotActive = false;
    const target = this.findAttachCell(this.shotX, this.shotY, hit);
    if (!target) { this.drawLauncher(); return; }
    const placed = this.addBall(this.shooter, target[0], target[1]);
    if (this.shooter === 'bomb') this.explode(placed);
    else if (this.shooter === 'clone') this.clone(placed);
    else this.resolveMatch(placed);
    this.shooter = this.reservedClone ? 'clone' : this.nextShooter;
    this.reservedClone = false;
    this.nextShooter = NORMAL[(this.score + this.level) % NORMAL.length];
    if (this.score >= this.level * 100) this.level++;
    this.drawLauncher(); this.updateHud(); this.toast.string = this.combo > 0 ? `COMBO x${this.combo} · NICE` : 'AIM · DRAG · RELEASE';
  }

  private findAttachCell(x:number, y:number, hit:Ball|null): [number,number] | null {
    if (!hit) return [0, Math.max(0, Math.min(COLS-1, Math.round((x-LEFT)/DX)))];
    const candidates = this.neighbors(hit.row, hit.col)
      .filter(([r,c]) => !this.map.get(this.key(r,c))?.alive);
    candidates.sort((a,b) => Math.hypot(this.xOf(a[0],a[1])-x,this.yOf(a[0])-y) - Math.hypot(this.xOf(b[0],b[1])-x,this.yOf(b[0])-y));
    return candidates[0] ?? null;
  }

  private resolveMatch(center:Ball) {
    if (!NORMAL.includes(center.kind)) return;
    const cluster = this.sameColorCluster(center);
    if (cluster.length < 3) { this.combo = 0; return; }
    cluster.forEach(b => this.remove(b));
    this.combo++; this.score += cluster.length * 10 * this.combo;
    this.dropUnsupported(); this.flash(this.xOf(center.row,center.col),this.yOf(center.row)); this.updateHud();
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
    targets.forEach(b=>this.remove(b)); this.remove(center);
    this.combo++; this.score += (targets.length+1)*15*this.combo;
    this.dropUnsupported(); this.flash(this.xOf(center.row,center.col),this.yOf(center.row)); this.updateHud();
  }

  private clone(center:Ball) {
    const candidates=this.neighbors(center.row,center.col).map(([r,c])=>this.map.get(this.key(r,c)))
      .filter((b): b is Ball=>!!b&&b.alive&&NORMAL.includes(b.kind));
    const source=candidates[0];
    if(!source){this.remove(center);return;}
    const empty=this.neighbors(center.row,center.col).filter(([r,c])=>!this.map.get(this.key(r,c))?.alive);
    empty.slice(0,2).forEach(([r,c])=>this.addBall(source.kind,r,c));
    this.remove(center); this.combo++; this.score += empty.length*12*this.combo; this.updateHud();
  }

  private holdClone() {
    if(this.shotActive || this.shooter!=='clone') return;
    this.reservedClone=true; this.shooter=this.nextShooter; this.nextShooter='clone';
    this.hint.string='CLONE 已保存 · 先处理当前局面，再决定何时释放'; this.drawLauncher();
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
    alive.filter(b=>b.kind!=='stone'&&!connected.has(this.key(b.row,b.col))).forEach(b=>{this.remove(b);this.score+=5;});
  }

  private remove(b:Ball){b.alive=false;this.map.delete(this.key(b.row,b.col));b.node.destroy();}
  private flash(x:number,y:number){
    this.fx.clear(); this.fx.strokeColor.fromHEX('#FFFFFF'); this.fx.lineWidth=4; this.fx.circle(x,y,30); this.fx.stroke();
    this.scheduleOnce(()=>this.fx.clear(),0.12);
  }
  private updateHud(){
    this.scoreLabel.string=`SCORE ${String(this.score).padStart(4,'0')}`;
    this.comboLabel.string=`COMBO x${this.combo}`;
  }
  private drawLauncher(){
    this.launcher.clear(); this.launcher.fillColor.fromHEX(COLORS[this.shooter]); this.launcher.circle(0,SHOOT_Y,23); this.launcher.fill();
    this.launcher.strokeColor.fromHEX('#FFFFFF'); this.launcher.lineWidth=2; this.launcher.circle(0,SHOOT_Y,17); this.launcher.stroke();
    if(this.shooter==='bomb'){this.launcher.moveTo(-7,SHOOT_Y-7);this.launcher.lineTo(7,SHOOT_Y+7);this.launcher.moveTo(-7,SHOOT_Y+7);this.launcher.lineTo(7,SHOOT_Y-7);this.launcher.stroke();}
    if(this.shooter==='clone'){this.launcher.moveTo(-7,SHOOT_Y);this.launcher.lineTo(7,SHOOT_Y);this.launcher.moveTo(0,SHOOT_Y-7);this.launcher.lineTo(0,SHOOT_Y+7);this.launcher.stroke();}
  }
}