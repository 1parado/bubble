# Cocos Creator Setup

1. Install Cocos Creator 3.x.
2. Open the bubble repository as a project.
3. Create a 2D scene named Main under assets/scenes.
4. Create an empty Node named BubbleGame.
5. Add the BubbleGame component from assets/scripts/BubbleGame.ts.
6. Save the scene and press Play.

The prototype creates its board, buttons, launcher, aiming line, bubbles, bomb, stone and clone visuals at runtime, so no external image assets are required.

The current repository intentionally keeps the scene setup minimal. This makes the level logic easy to iterate while the project is being used as a game-design prototype.