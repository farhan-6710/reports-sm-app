#!/bin/bash

echo "🚀 Setting up Social Media Analytics Dashboard..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠️  MySQL not found. Please install MySQL first.${NC}"
    exit 1
fi

# Check if PHP is installed
if ! command -v php &> /dev/null; then
    echo -e "${YELLOW}⚠️  PHP not found. Please install PHP first.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Setting up backend...${NC}"
cd backend

# Create database
echo -e "${BLUE}Creating database...${NC}"
mysql -u root -p < schema.sql

# Ask for database credentials
echo -e "${YELLOW}Please enter your MySQL root password:${NC}"
read -s mysql_password

# Update database config
echo -e "${BLUE}Configuring database...${NC}"
cd ..

echo -e "${GREEN}✅ Backend setup complete!${NC}"
echo ""

echo -e "${BLUE}📦 Setting up frontend...${NC}"
cd frontend

# Install npm dependencies
if [ -d "node_modules" ]; then
    echo -e "${GREEN}Dependencies already installed${NC}"
else
    echo -e "${BLUE}Installing npm dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Frontend setup complete!${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Configure your API keys in backend/config/config.php"
echo "2. Start the backend server: cd backend && php -S localhost:8000 -t api"
echo "3. Start the frontend: cd frontend && npm start"
echo ""
echo -e "${GREEN}Happy analyzing! 📊📱✨${NC}"

