# Paytag M-Pesa Proxy Server

Node.js proxy server to handle M-Pesa API requests with correct Origin header (102.212.246.90).

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Update PORT if needed (default: 5000)
3. Add your frontend URLs to ALLOWED_ORIGINS

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Deployment Options

### Option 1: Heroku
```bash
heroku create paytag-mpesa-proxy
git push heroku main
```

### Option 2: Railway
1. Connect GitHub repository
2. Deploy automatically

### Option 3: DigitalOcean App Platform
1. Create new app
2. Connect repository
3. Configure build settings

### Option 4: AWS EC2
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Run server
pm2 start server.js --name paytag-proxy
pm2 save
pm2 startup
```

## API Endpoints

### POST /mpesa-proxy
Proxy M-Pesa API POST requests

**Request:**
```json
{
  "url": "https://openapi.m-pesa.com/...",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer xxx"
  },
  "body": {
    "input_Amount": "100.00"
  }
}
```

### GET /mpesa-proxy
Proxy M-Pesa API GET requests

**Query Parameters:**
- url: M-Pesa API endpoint
- Additional headers as query params

### GET /health
Health check endpoint

## Testing

```bash
curl http://localhost:3000/health
```

## Update Frontend

Replace `https://proxy-api.trickle-app.host/` with your proxy server URL:
```javascript
// Before
fetch('https://proxy-api.trickle-app.host/?url=...')

// After
fetch('https://your-proxy-domain.com/mpesa-proxy', {
  method: 'POST',
  body: JSON.stringify({
    url: 'https://openapi.m-pesa.com/...',
    headers: {...},
    body: {...}
  })
})
```

## License
MIT