# Proxy Server Deployment Guide

## Prerequisites
- Node.js 14+ installed
- Static IP address: 69.167.136.50 (must be whitelisted with Vodacom M-Pesa)
- Domain: paytag.co.ls pointing to the whitelisted IP

## Quick Start

### 1. Local Testing
```bash
cd proxy-server
npm install
npm start
```

Server will run on http://localhost:3000

### 2. Deploy to Production

#### Option A: Railway (Recommended - Easy Setup)

1. **Sign up at Railway.app**
   - Visit https://railway.app
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository
   - Select `proxy-server` as root directory

3. **Configure Environment**
   - Go to project settings
   - Add environment variables:
     ```
     PORT=3000
     NODE_ENV=production
     ```

4. **Get Your URL**
   - Railway will provide a URL like: `https://your-app.railway.app`
   - Update frontend to use this URL

#### Option B: Heroku

1. **Install Heroku CLI**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

2. **Create Heroku App**
```bash
cd proxy-server
heroku login
heroku create paytag-mpesa-proxy
```

3. **Deploy**
```bash
git init
git add .
git commit -m "Deploy proxy server"
heroku git:remote -a paytag-mpesa-proxy
git push heroku main
```

4. **Get Your URL**
```bash
heroku info
```

#### Option C: DigitalOcean App Platform

1. **Sign up at DigitalOcean**
   - Visit https://cloud.digitalocean.com

2. **Create New App**
   - Click "Apps" → "Create App"
   - Connect your GitHub repository
   - Select `proxy-server` folder

3. **Configure Build Settings**
   - Build Command: `npm install`
   - Run Command: `npm start`
   - Port: 3000

4. **Deploy**
   - Click "Deploy"
   - Get your app URL

#### Option D: AWS EC2 (For Static IP Control)

1. **Launch EC2 Instance**
```bash
# Choose Ubuntu 22.04 LTS
# Instance type: t2.micro (free tier)
# Configure security group: Allow ports 22, 80, 443, 3000
```

2. **Connect and Setup**
```bash
ssh -i your-key.pem ubuntu@your-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone your repo
git clone your-repo-url
cd proxy-server
npm install

# Start with PM2
pm2 start server.js --name paytag-proxy
pm2 save
pm2 startup
```

3. **Configure Nginx (Optional)**
```bash
sudo apt-get install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/paytag-proxy

# Add:
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/paytag-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Update Frontend Code

After deployment, update `utils/mpesa.js`:

```javascript
// Replace the proxyFetch function URL
const proxyUrl = `YOUR_PROXY_URL/mpesa-proxy`;

// Example for Railway:
const proxyUrl = `https://your-app.railway.app/mpesa-proxy`;

// Send request
const response = await fetch(proxyUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://openapi.m-pesa.com/...',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: payloadData
  })
});
```

## Testing

### Test Health Endpoint
```bash
curl https://your-proxy-url/health
```

Should return:
```json
{
  "status": "ok",
  "message": "Proxy server is running"
}
```

### Test M-Pesa Proxy
```bash
curl -X POST https://your-proxy-url/mpesa-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://openapi.m-pesa.com/openapi/ipg/v2/vodacomLES/getSession/",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer YOUR_API_KEY"
    }
  }'
```

## Important Notes

1. **IP Whitelisting**: Ensure your proxy server's IP (69.167.136.50) is whitelisted with Vodacom M-Pesa
2. **Origin Header**: The proxy automatically sets `Origin: https://paytag.co.ls`
3. **SSL/TLS**: Use HTTPS in production
4. **Monitoring**: Set up logging and error tracking
5. **Rate Limiting**: Consider adding rate limiting for security

## Troubleshooting

### Connection Refused
- Check if server is running: `pm2 status`
- Check port availability: `netstat -tuln | grep 3000`

### CORS Errors
- Verify frontend URL is in CORS whitelist
- Check browser console for detailed errors

### M-Pesa API Errors
- Verify Origin header: `https://paytag.co.ls`
- Check IP is whitelisted: 69.167.136.50
- Verify API credentials

## Support
For issues, contact: support@paytag.co.ls