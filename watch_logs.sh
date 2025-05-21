#!/bin/bash

# Colors for formatting
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Sky Squad Flight Simulator Log Watcher ===${NC}"
echo -e "${YELLOW}Watching logs from both client and server containers${NC}"
echo -e "${GREEN}Press Ctrl+C to exit${NC}\n"

# Function to watch logs with proper formatting
watch_logs() {
  # Use tmux to split the terminal and show both logs
  if command -v tmux &> /dev/null; then
    tmux new-session \
      "docker logs kids_flight_simulator-server-1 -f --tail=50 | sed 's/^/[SERVER] /' & 
       docker logs kids_flight_simulator-client-1 -f --tail=50 | sed 's/^/[CLIENT] /' &
       wait" \;
  else
    # Fallback if tmux is not available
    echo -e "${RED}tmux not found, showing logs sequentially.${NC}"
    echo -e "${YELLOW}SERVER LOGS:${NC}"
    docker logs kids_flight_simulator-server-1 --tail=50
    echo -e "\n${YELLOW}CLIENT LOGS:${NC}"
    docker logs kids_flight_simulator-client-1 --tail=50
    
    echo -e "\n${BLUE}Press Enter to start following logs...${NC}"
    read
    
    # Follow logs (this will only show one at a time)
    echo -e "${YELLOW}Following SERVER logs (Ctrl+C to switch to CLIENT logs)${NC}"
    docker logs kids_flight_simulator-server-1 -f
    echo -e "${YELLOW}Following CLIENT logs (Ctrl+C to exit)${NC}"
    docker logs kids_flight_simulator-client-1 -f
  fi
}

# Make the script executable
chmod +x "$0"

# Run the log watcher
watch_logs
