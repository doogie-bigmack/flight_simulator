# Game Design Document

## Overview
Sky Squad is a cooperative 2D flight game aimed at children aged 6–12. Players control colorful planes and work together to collect stars scattered around a bright, cartoon sky.

## Core Mechanics
- **Star Collection**: Stars spawn at random positions. Collecting a star adds 10 points to the shared team score.
- **Movement**: Planes move with arrow keys. Up increases speed up to 0.2 units/frame, Down decreases speed down to 0.05 units/frame, Left/Right rotate the plane 5 degrees per frame.
- **Collision**: When a plane intersects with a star, the star disappears and the score increases.

## Visual Style
- Bright blue sky background with fluffy white clouds and a cheerful sun.
- Plane sprites come in red, blue, and yellow variations.
- Stars twinkle with a simple animation when idle and flash when collected.
- Font is large and rounded to remain readable for young players.

## Scoring System
- Team score starts at zero and increases by 10 for each collected star.
- The current score is displayed at the top center of the screen.
- Individual player stats (total stars collected) are stored per account for later retrieval.

## Multiplayer Interaction
- Up to four players connect to the same session via WebSockets.
- Player usernames appear above their planes.
- All players see the same set of stars and share the score.
- Simple chat or emote system can be added later to encourage cooperation.

## Level Progression
- Initial prototype features an endless sky where stars continue to spawn.
- Future levels may introduce obstacles or moving patterns to keep players engaged.

## Controls
- Arrow keys control movement as outlined above.
- On touch devices, on-screen buttons mirror the arrow key functions.

## UI Wireframes (Textual)
- **Main Menu**: Start Game, How to Play, and Settings buttons.
- **In-Game HUD**: Score display at top center, username labels above planes.
- **Registration Screen**: Simple form asking for username, email, and password with a large "Play" button.

## Assets
Use free assets from OpenGameArt.org or similar sources. Placeholder images can be used during development with instructions to replace them before release.

