# Claude Guidelines for Kids Flight Simulator Project

## Project Overview
- "Sky Squad" is a 2D multiplayer flight simulator game for kids aged 6-12
- Uses Three.js for frontend, Python FastAPI for backend, and Docker for deployment
- Collaborative gameplay where players fly planes to collect stars
- Includes player registration with OIDC authentication
- Follows a bright, cartoonish, kid-friendly design

## Code Style Guidelines

### Python Backend
- Follow PEP 8 standards (4-space indentation, max line length 79)
- Use snake_case for functions/variables and CapWords for classes
- Always use JSON logging (never print statements)
- Write robust error handling and input validation
- Document all functions and classes with docstrings
- Organize code into modular components
- Use typing annotations for all functions

### JavaScript Frontend
- Use camelCase naming convention
- 2-space indentation
- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (e.g., import { foo } from 'bar')
- Keep functions small and focused on a single responsibility
- Comment complex logic or animations

## Common Commands

### Development
- `docker-compose up` - Start the development environment
- `docker-compose down` - Stop the development environment
- `npm run build` - Build the frontend
- `npm run dev` - Run frontend in development mode

### Testing
- `make test` - Run all tests
- `pytest test_file.py` - Run specific Python tests
- `npm test` - Run frontend tests
- `npm run lint` - Run linting

### Deployment
- `make deploy` - Deploy the application
- `docker-compose -f docker-compose.prod.yml up -d` - Start production environment

## Project Structure

### Frontend Structure
- Use Three.js for 2D rendering with sprites
- Implement kid-friendly animations and sounds
- Create simple registration/login page
- Handle WebSocket communication with backend

### Backend Structure
- FastAPI with FastAPI-SocketIO for real-time multiplayer
- REST APIs for registration, login, and stats
- SQLite database for user data
- OIDC authentication flow integration

## Development Workflow
- Plan changes before implementation
- Write tests for new features
- Follow Git workflow with descriptive commit messages
- Run linters and type checking before committing
- Document all new functionality in code comments
- Ensure all tests pass before finalizing changes

## Important Technical Requirements

### Game Mechanics
- 2D top-down view with bright, cartoonish graphics
- Arrow key controls (Up/Down for speed, Left/Right for rotation)
- Random star spawning for collection and scoring
- Real-time multiplayer support for 2-4 players
- Display team score and player usernames

### Performance Constraints
- Render at 60 FPS
- Server handles up to 4 players without lag
- Server synchronizes game state every 50ms
- Network latency under 100ms

## Testing Requirements
- 80% code coverage for unit tests
- Integration tests for client-server synchronization
- Performance tests for rendering and server latency
- Security tests for input validation and authentication

## Deployment
- Dockerized application with separate containers for frontend and backend
- Frontend exposed on port 80, backend on port 8000
- Proper environment variable configuration for OIDC

## Security Considerations
- Protect API endpoints with JWT tokens
- Validate and sanitize all user inputs
- Secure WebSocket connections
- Store passwords with proper hashing
- Follow OIDC best practices for authentication

## Additional Notes
- Use free/open-source assets for graphics
- Keep game mechanics simple and kid-friendly
- Maintain a collaborative rather than competitive gameplay focus
- Provide positive feedback for star collection
- Ensure smooth animation and responsive controls
