#!/bin/bash

# SSL Setup Script for Flotilla
# Domain: 571732.xyz

set -e

echo "🔒 Flotilla SSL Certificate Setup"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Domain configuration
DOMAIN="571732.xyz"
SUBDOMAINS="flotilla.${DOMAIN} app.${DOMAIN} api.${DOMAIN}"
EMAIL="jia@${DOMAIN}"  # Change this to your email

echo -e "${YELLOW}📝 Configuration:${NC}"
echo "Domain: ${DOMAIN}"
echo "Subdomains: ${SUBDOMAINS}"
echo "Email: ${EMAIL}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${GREEN}📁 Creating directories...${NC}"
mkdir -p nginx/certbot/conf
mkdir -p nginx/certbot/www

# Step 1: Start services without SSL
echo -e "${GREEN}🚀 Step 1: Starting services (HTTP only)...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx

echo ""
echo -e "${YELLOW}⏳ Waiting for Nginx to start...${NC}"
sleep 5

# Step 2: Obtain SSL certificates
echo ""
echo -e "${GREEN}🔐 Step 2: Obtaining SSL certificates...${NC}"
echo -e "${YELLOW}⚠️  This requires DNS records to be properly configured!${NC}"
echo ""
echo "Please ensure the following DNS A records point to your server IP:"
echo "  - flotilla.${DOMAIN}"
echo "  - app.${DOMAIN}"
echo "  - api.${DOMAIN}"
echo ""
read -p "Press Enter to continue when DNS is ready, or Ctrl+C to abort..."

# Obtain certificates for each subdomain
for subdomain in flotilla.${DOMAIN} app.${DOMAIN} api.${DOMAIN}; do
    echo ""
    echo -e "${GREEN}📜 Obtaining certificate for ${subdomain}...${NC}"

    docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot \
        certonly --webroot \
        --webroot-path=/var/www/certbot \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        -d ${subdomain}

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Certificate obtained for ${subdomain}${NC}"
    else
        echo -e "${RED}❌ Failed to obtain certificate for ${subdomain}${NC}"
        echo "Please check:"
        echo "  1. DNS records are correctly configured"
        echo "  2. Port 80 is accessible from the internet"
        echo "  3. Domain is not rate-limited by Let's Encrypt"
        exit 1
    fi
done

# Step 3: Enable HTTPS in Nginx config
echo ""
echo -e "${GREEN}🔄 Step 3: Enabling HTTPS in Nginx configuration...${NC}"
echo -e "${YELLOW}⚠️  Please manually uncomment the HTTPS server blocks in nginx/flotilla.conf${NC}"
echo -e "${YELLOW}⚠️  and comment out the temporary HTTP location blocks${NC}"
echo ""
read -p "Press Enter after you've updated the configuration, or Ctrl+C to abort..."

# Step 4: Reload Nginx
echo ""
echo -e "${GREEN}🔄 Step 4: Reloading Nginx...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx nginx -s reload

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to reload Nginx${NC}"
    exit 1
fi

# Step 5: Test SSL
echo ""
echo -e "${GREEN}🧪 Step 5: Testing SSL configuration...${NC}"
for subdomain in flotilla.${DOMAIN} app.${DOMAIN} api.${DOMAIN}; do
    echo -ne "Testing ${subdomain}... "
    if curl -s -o /dev/null -w "%{http_code}" https://${subdomain} | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Check manually${NC}"
    fi
done

# Success
echo ""
echo -e "${GREEN}🎉 SSL Setup Complete!${NC}"
echo ""
echo "Your Flotilla platform is now accessible at:"
echo "  - Official Website: https://flotilla.${DOMAIN}"
echo "  - Application: https://app.${DOMAIN}"
echo "  - API: https://api.${DOMAIN}"
echo ""
echo "Certificate auto-renewal is configured via certbot container."
echo "Certificates will be automatically renewed every 12 hours."
echo ""
echo -e "${YELLOW}📌 Next steps:${NC}"
echo "  1. Update NEXT_PUBLIC_APP_URL in website to use HTTPS"
echo "  2. Configure CORS in backend for your domain"
echo "  3. Set up monitoring and backup"
echo ""
