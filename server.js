import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - Allow Trickle + your own domain
app.use(cors({
  origin: [
    "https://preview--c1ztszfll2cb.trickle.host",
    "https://c1ztszfll2cb.trickle.host",
    "https://trickle.so",
    "https://paytag.co.ls",
    "https://paytag-proxy-server-production-0ef3.up.railway.app"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Root endpoint (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Paytag Proxy Server running successfully",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      getSession: "/getSession",
      c2bPayment: "/c2bPayment",
      b2bPayment: "/b2bPayment",
      mpesaProxy: "/mpesa-proxy"
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    message: "Proxy server is running",
    timestamp: new Date().toISOString()
  });
});

// M-Pesa Session Token (OAuth)
app.post("/getSession", async (req, res) => {
  try {
    const response = await fetch(
      "https://openapi.m-pesa.com/openapi/ipg/v2/vodacomLES/getSession/",
      {
        method: "GET",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.CONSUMER_KEY + ":" + process.env.CONSUMER_SECRET
            ).toString("base64"),
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("getSession error:", err);
    res.status(500).json({ error: "Failed to get M-Pesa session token" });
  }
});

// C2B Payment (Customer → Business)
app.post("/c2bPayment", async (req, res) => {
  const { amount, msisdn, reference } = req.body;
  try {
    // Step 1: Get access token
    const tokenResponse = await fetch(
      "https://openapi.m-pesa.com/openapi/ipg/v2/vodacomLES/getSession/",
      {
        method: "GET",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.CONSUMER_KEY + ":" + process.env.CONSUMER_SECRET
            ).toString("base64"),
        },
      }
    );
    const tokenData = await tokenResponse.json();
    const token = tokenData.output_Accesstoken || tokenData.access_token;

    // Step 2: Send C2B payment request
    const paymentResponse = await fetch(
      "https://openapi.m-pesa.com/openapi/ipg/v2/vodacomLES/c2bPayment/singleStage/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          input_Amount: amount,
          input_Country: "LES",
          input_Currency: "LSL",
          input_CustomerMSISDN: msisdn,
          input_ServiceProviderCode: process.env.BUSINESS_SHORTCODE,
          input_ThirdPartyReference: reference,
          input_TransactionReference: "TXN" + Date.now(),
        }),
      }
    );

    const result = await paymentResponse.json();
    res.json(result);
  } catch (error) {
    console.error("C2B Payment Error:", error);
    res.status(500).json({ error: "Payment request failed" });
  }
});

// B2B Payment (Business → Business)
app.post("/b2bPayment", async (req, res) => {
  const { amount, receiverShortcode, reference } = req.body;
  try {
    // Step 1: Get token
    const tokenResponse = await fetch(
      "https://openapi.m-pesa.com/openapi/ipg/v2/vodacomLES/getSession/",
      {
        method: "GET",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.CONSUMER_KEY + ":" + process.env.CONSUMER_SECRET
            ).toString("base64"),
        },
      }
    );
    const tokenData = await tokenResponse.json();
    const token = tokenData.output_Accesstoken || tokenData.access_token;

    // Step 2: Send B2B payment
    const paymentResponse = await fetch(
      "https://openapi.m-pesa.com/openapi/ipg/v2/vodacomLES/b2bPayment/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          input_Amount: amount,
          input_Country: "LES",
          input_Currency: "LSL",
          input_PrimaryPartyCode: process.env.BUSINESS_SHORTCODE,
          input_ReceiverPartyCode: receiverShortcode,
          input_ThirdPartyReference: reference,
          input_TransactionReference: "B2B" + Date.now(),
        }),
      }
    );

    const result = await paymentResponse.json();
    res.json(result);
  } catch (error) {
    console.error("B2B Payment Error:", error);
    res.status(500).json({ error: "B2B Payment request failed" });
  }
});

// Generic M-Pesa API proxy endpoint
app.post('/mpesa-proxy', async (req, res) => {
  try {
    const { url, method = 'POST', headers = {}, body } = req.body;

    if (!url) {
      console.error('No URL provided in request');
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('=== M-Pesa Proxy Request ===');
    console.log(`Method: ${method}`);
    console.log(`Target URL: ${url}`);
    console.log(`Origin: https://paytag.co.ls`);
    console.log(`Headers:`, JSON.stringify(headers, null, 2));
    console.log(`Body:`, JSON.stringify(body, null, 2));

    // Make request to M-Pesa API with correct Origin header
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://paytag.co.ls',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    console.log(`📊 M-Pesa Response Status: ${response.status}`);
    console.log(`📊 M-Pesa Response Status Text: ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    console.log(`📊 Content-Type: ${contentType}`);
    
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log(' M-Pesa Response (JSON):', JSON.stringify(data, null, 2));
    } else {
      data = await response.text();
      console.log(' M-Pesa Response (Text, first 1000 chars):', data.substring(0, 1000));
      
      // Try to parse as JSON if it looks like JSON
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        try {
          data = JSON.parse(data);
          console.log(' Successfully parsed text response as JSON');
        } catch (parseError) {
          console.log(' Response looks like JSON but failed to parse:', parseError.message);
        }
      }
    }

    // Return response with proper status code
    res.status(response.status).json(typeof data === 'string' ? { response: data } : data);

  } catch (error) {
    console.error('Proxy error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Proxy request failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// M-Pesa GET requests proxy (for balance, status queries)
app.get('/mpesa-proxy', async (req, res) => {
  try {
    const { url, ...headers } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Proxying GET request to: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://paytag.co.ls',  // Use registered domain
        ...headers
      }
    });

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    res.status(response.status).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy request failed',
      message: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Paytag Proxy Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for Trickle domains`);
});
