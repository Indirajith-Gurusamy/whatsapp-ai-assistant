# WhatsApp AI Assistant

A full-stack WhatsApp chatbot with AI-powered responses, built with FastAPI (Python) and Next.js (TypeScript).

## 🚀 Features

- **WhatsApp Integration**: Receive and respond to WhatsApp messages via Twilio
- **AI Responses**: Powered by Groq LLM (Llama 3.3 70B)
- **Conversation Management**: Track and manage customer conversations
- **Lead Tracking**: Categorize and manage leads with status updates
- **Analytics Dashboard**: View conversation statistics and metrics
- **Email Notifications**: Get notified of new messages
- **Modern UI**: Built with Next.js, React, and Tailwind CSS

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Python web framework
- **PostgreSQL** - Database (via Prisma ORM)
- **Groq** - LLM API for AI responses
- **Twilio** - WhatsApp API integration
- **Prisma** - Database ORM

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

## 📁 Project Structure

```
.
├── apps/
│   ├── backend/             # FastAPI backend (Source code)
│   ├── frontend/            # Next.js frontend (Source code)
│   └── env/                 # Environment configuration
│       ├── backend.env
│       └── frontend.env
│
├── prisma/                 # Database schema
│   └── schema.prisma
│
├── .env                    # Active environment variables (not committed)
└── requirements.txt        # Python dependencies
```

## 🛠️ Setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- PostgreSQL
- Twilio account (for WhatsApp)
- Groq API key

### Backend Setup

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   The backend uses the root `.env` file. You can reference `apps/env/backend.env` for the complete list of required variables.
   ```bash
   # Edit the root .env file with your actual values
   # See apps/env/backend.env for all available configuration options
   ```

4. **Run database migrations:**
   ```bash
   prisma generate
   prisma db push
   ```

5. **Start backend:**
   ```bash
   python apps/backend/run.py
   ```
   Backend runs on `http://localhost:8000`

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd apps/frontend
   npm install
   ```

2. **Set up environment variables (optional):**
   ```bash
   cp ../env/frontend.env .env.local
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:3000`

### Webhook Setup (for WhatsApp)

1. **Start ngrok:**
   ```bash
   ngrok http 8000
   ```

2. **Configure Twilio webhook:**
   - Go to Twilio Console → WhatsApp Sandbox
   - Set webhook URL to: `https://your-ngrok-url.ngrok.io/webhook`

## 📱 Usage

1. Send a WhatsApp message to your Twilio number
2. The bot receives the message via webhook
3. AI generates a response using Groq
4. Response is sent back via WhatsApp
5. View conversations in the web dashboard

## 🎯 API Endpoints

### Backend (Port 8000)
- `GET /api/conversations` - List conversations
- `GET /api/conversation/{id}` - Get conversation details
- `GET /api/customers` - List customers
- `GET /api/analytics` - Get analytics data
- `POST /webhook` - Twilio webhook endpoint

### Frontend (Port 3000)
- `/` - Home
- `/conversations` - Conversations list
- `/customers` - Customers list
- `/analytics` - Analytics dashboard
- `/messages` - Messages list

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GROQ_API_KEY` | Groq API key for LLM |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | Twilio WhatsApp number |
| `RESPONSE_PHONE_NUMBER` | (Optional) Test phone number |

## 📝 License

MIT

## 👤 Author

Your Name

## 🙏 Acknowledgments

- Groq for LLM API
- Twilio for WhatsApp integration
- Vercel for Next.js
