# College Basketball Dynasty Simulation

A college basketball dynasty management game built with Electron, React, and TypeScript. Manage your program, recruit players, develop talent, and compete for championships.

## Development

### Running the App

```bash
npm install
npm run dev:electron
```

### Testing

Run the end-to-end season flow test to verify offseason transitions:

```bash
npm run test:season-flow
```

This validates:
- Player graduation (seniors leaving)
- Stats reset for returning players
- Signed recruits converting to roster players
- New recruit class generation (~300 recruits)
- Season year increment and phase transitions
- Schedule generation for new season
- Awards assignment during offseason

### Building

```bash
npm run build
```

## Project Structure

- `src/game/` - Core simulation engine and data models
- `src/ui/` - React components and screens
- `electron/` - Electron main process and preload scripts
- `scripts/` - Build and test utilities
