#!/bin/bash
# Production Deployment Script

set -e

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}❌ Please edit .env with your production values!${NC}"
    exit 1
fi

# Build frontend
echo -e "${GREEN}📦 Building React frontend...${NC}"
cd frontend
npm install
npm run build
cd ..

echo -e "${GREEN}✅ Frontend built successfully!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Upload backend/ folder to your server"
echo "2. Upload frontend/build/ contents to your web root"
echo "3. Set up database using backend/schema.sql"
echo "4. Configure web server (Apache/Nginx)"
echo "5. Set environment variables on server"
echo "6. Update Facebook App settings with production URLs"
echo "7. Test OAuth flow"

echo -e "${GREEN}✨ Deployment preparation complete!${NC}"

