import { _decorator, Component, Node, Graphics, Label, Vec3, view } from 'cc';

const { ccclass } = _decorator;

type Kind = 'red' | 'yellow' | 'blue' | 'green' | 'bomb' | 'stone' | 'clone';

const COLORS: Record<Kind, string> = {
  red: '#F45B69',
  yellow: '#F7C948',
  blue: '#4D96FF',
  green: '#55C271',
  bomb: '#30343B',
  stone: '#8B929A',
  clone: '#7C6CF2'
};

const NORMAL: Kind[] = ['red', 'yellow', 'blue', 'green'];

interface Ball {
  node: Node;
  kind: Kind;
  x: number;
  y: number;
  alive: boolean;
}

@ccclass('BubbleGame')
export class BubbleGame extends Component {
  private root!: Node;
  private board!: Node;
  private aim!: Graphics;
  private launcher!: Graphics;
  private hint!: Label;
  private balls: Ball[] = [];

  private mode: 'bomb' | 'stone' | 'clone' = 'bomb';
  private shooter: Kind = 'red';
  private nextShooter: Kind = 'blue';
  private radius = 20;
  private left = -190;
  private top = 285;
  private launcherY = -285;
  private angle = Math.PI / 2;
  private aiming = false;

  start() {
    this.buildUI();
    this.reset();
  }

  private buildUI() {
    this.root = new Node('BubbleCasualLab');
    this.node.addChild(this.root);

    const bg = new Node('Background');
    const bgG = bg.addComponent(Graphics);
    bgG.fillColor.fromHEX('#F6F7F9');
    bgG.rect(-260, -350, 520, 700);
    bgG.fill();
    this.root.addChild(bg);

    this.board = new Node('Board');
    this.root.addChild(this.board);

    const title = new Node('Title');
    const titleLabel = title.addComponent(Label);
    titleLabel.string = 'Bubble Casual Lab';
    titleLabel.fontSize = 20;
    titleLabel.color.fromHEX('#1F2937');
    title.position = new Vec3(0, 325);
    this.root.addChild(title);

    this.hint = new Node('Hint').addComponent(Label);
    this.hint.fontSize = 11;
    this.hint.color.fromHEX('#6B7280');
    this.hint.node.position = new Vec3(0, 300);
    this.root.addChild(this.hint.node);

    this.button('BOMB', -145, 255, () => this.setMode('bomb'));
    this.button('STONE', 0, 255, () => this.setMode('stone'));
    this.button('CLONE', 145, 255, () => this.setMode('clone'));
    this.button('RESTART', 0, -330, () => this.reset());

    this.aim = this.root.addComponent(Graphics);
    this.launcher = this.root.addComponent(Graphics);

    this.root.on(Node.EventType.TOUCH_START, this.pointer, this);
    this.root.on(Node.EventType.TOUCH_MOVE, this.pointer, this);
    this.root.on(Node.EventType.TOUCH_END, this.shoot, this);
  }

  private button(text: string, x: number, y: number, fn: () => void) {
    const n = new Node(text);
    const g = n.addComponent(Graphics);
    g.fillColor.fromHEX('#FFFFFF');
    g.roundRect(-58, -17, 116, 34, 9);
    g.fill();
    g.strokeColor.fromHEX('#D1D5DB');
    g.lineWidth = 1;
    g.roundRect(-58, -17, 116, 34, 9);
    g.stroke();

    const label = n.addComponent(Label);
    label.string = text;
    label.fontSize = 11;
    label.color.fromHEX('#374151');
    n.position = new Vec3(x, y);
    this.root.addChild(n);
    n.on(Node.EventType.TOUCH_END, fn);
  }

  private setMode(mode: 'bomb' | 'stone' | 'clone') {
    this.mode = mode;
    this.reset();
  }

  private reset() {
    this.balls.forEach(b => b.node.destroy());
    this.balls = [];

    const descriptions = {
      bomb: 'BOMB · 精准击球制造局部爆发与连锁',
      stone: 'STONE · 障碍改变射击路线与角度',
      clone: 'CLONE · 决定现在使用还是保存克隆机会'
    };
    this.hint.string = descriptions[this.mode];

    for (let row = 0; row < 9; row++) {
      const count = row % 2 === 0 ? 10 : 9;
      for (let col = 0; col < count; col++) {
        this.addBall(this.initial(row, col), row, col);
      }
    }

    this.shooter = NORMAL[0];
    this.nextShooter = NORMAL[1];
    this.drawLauncher();
  }

  private initial(row: number, col: number): Kind {
    if (this.mode === 'bomb' && ((row === 3 && col === 4) || (row === 4 && col === 5))) return 'bomb';
    if (this.mode === 'stone' && ((row === 3 && col >= 2 && col <= 7) || (row === 4 && col === 4))) return 'stone';
    if (this.mode === 'clone' && row === 4 && col === 4) return 'clone';
    return NORMAL[(row * 3 + col * 2) % NORMAL.length];
  }

  private xOf(row: number, col: number) {
    return this.left + col * 42 + (row % 2 ? 20 : 0);
  }

  private yOf(row: number) {
    return this.top - row * 35;
  }

  private addBall(kind: Kind, row: number, col: number, x?: number, y?: number) {
    const n = new Node(kind);
    const g = n.addComponent(Graphics);
    g.fillColor.fromHEX(COLORS[kind]);
    g.circle(0, 0, this.radius);
    g.fill();

    if (kind === 'bomb' || kind === 'clone') {
      g.strokeColor.fromHEX('#FFFFFF');
      g.lineWidth = 3;
      g.circle(0, 0, 13);
      g.stroke();
      if (kind === 'bomb') {
        g.moveTo(-7, 7); g.lineTo(7, -7); g.stroke();
        g.moveTo(-7, -7); g.lineTo(7, 7); g.stroke();
      } else {
        g.moveTo(-7, 0); g.lineTo(7, 0); g.stroke();
        g.moveTo(0, -7); g.lineTo(0, 7); g.stroke();
      }
    }

    const px = x ?? this.xOf(row, col);
    const py = y ?? this.yOf(row);
    n.position = new Vec3(px, py);
    this.board.addChild(n);
    this.balls.push({ node: n, kind, x: px, y: py, alive: true });
  }

  private pointer(e: any) {
    const p = e.getUILocation();
    const size = view.getVisibleSize();
    const x = p.x - size.width / 2;
    const y = p.y - size.height / 2;
    this.angle = Math.atan2(y - this.launcherY, x);
    this.angle = Math.max(0.25, Math.min(Math.PI - 0.25, this.angle));
    this.aim.clear();
    this.aim.strokeColor.fromHEX('#9CA3AF');
    this.aim.lineWidth = 2;
    this.aim.moveTo(0, this.launcherY);
    this.aim.lineTo(Math.cos(this.angle) * 150, this.launcherY + Math.sin(this.angle) * 150);
    this.aim.stroke();
    this.aiming = true;
  }

  private shoot() {
    if (!this.aiming) return;
    this.aiming = false;
    this.aim.clear();

    const n = new Node('Shot');
    const g = n.addComponent(Graphics);
    g.fillColor.fromHEX(COLORS[this.shooter]);
    g.circle(0, 0, this.radius);
    g.fill();
    this.root.addChild(n);

    let x = 0;
    let y = this.launcherY;
    const vx = Math.cos(this.angle) * 9;
    const vy = Math.sin(this.angle) * 9;

    const tick = () => {
      if (!n.isValid) return;
      x += vx;
      y += vy;
      if (x < -245 || x > 245) {
        x = Math.max(-245, Math.min(245, x));
        this.angle = Math.PI - this.angle;
      }
      n.position = new Vec3(x, y);

      const hit = this.balls.find(b => b.alive && Math.hypot(b.x - x, b.y - y) < 36);
      if (hit || y > this.top + 30) {
        n.destroy();
        this.resolve(x, y);
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  private resolve(x: number, y: number) {
    const row = Math.max(0, Math.min(8, Math.round((this.top - y) / 35)));
    const col = Math.max(0, Math.min(9, Math.round((x - this.left - (row % 2 ? 20 : 0)) / 42)));
    const px = this.xOf(row, col);
    const py = this.yOf(row);

    this.addBall(this.shooter, row, col, px, py);

    if (this.mode === 'bomb' && this.shooter === 'bomb') this.explode(px, py);
    if (this.mode === 'clone' && this.shooter === 'clone') this.clone(px, py);

    this.match(px, py);
    this.shooter = this.nextShooter;
    this.nextShooter = NORMAL[Math.floor(Math.random() * NORMAL.length)];
    this.drawLauncher();
  }

  private match(x: number, y: number) {
    const center = this.balls.filter(b => b.alive && NORMAL.includes(b.kind))
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];

    if (!center) return;
    const cluster = this.balls.filter(b => b.alive && b.kind === center.kind && Math.hypot(b.x - center.x, b.y - center.y) < 75);
    if (cluster.length < 3) return;

    cluster.forEach(b => this.remove(b));
    this.drop();
  }

  private explode(x: number, y: number) {
    this.balls.filter(b => b.alive && Math.hypot(b.x - x, b.y - y) < 65).forEach(b => this.remove(b));
    this.drop();
  }

  private clone(x: number, y: number) {
    const nearest = this.balls.filter(b => b.alive && NORMAL.includes(b.kind))
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];

    if (!nearest) return;
    this.addBall(nearest.kind, 0, 0, nearest.x + 42, nearest.y);
    this.addBall(nearest.kind, 0, 0, nearest.x - 42, nearest.y);
  }

  private remove(b: Ball) {
    b.alive = false;
    b.node.destroy();
  }

  private drop() {
    const alive = this.balls.filter(b => b.alive);
    const connected = new Set<Ball>();
    const queue = alive.filter(b => b.y > this.top - 25);
    queue.forEach(b => connected.add(b));

    while (queue.length) {
      const current = queue.shift()!;
      alive.forEach(b => {
        if (!connected.has(b) && b.kind !== 'stone' && Math.hypot(b.x - current.x, b.y - current.y) < 48) {
          connected.add(b);
          queue.push(b);
        }
      });
    }

    alive.forEach(b => {
      if (!connected.has(b) && b.kind !== 'stone') this.remove(b);
    });
  }

  private drawLauncher() {
    this.launcher.clear();
    this.launcher.fillColor.fromHEX(COLORS[this.shooter]);
    this.launcher.circle(0, this.launcherY, 23);
    this.launcher.fill();
    this.launcher.strokeColor.fromHEX('#FFFFFF');
    this.launcher.lineWidth = 2;
    this.launcher.circle(0, this.launcherY, 17);
    this.launcher.stroke();
  }
}
