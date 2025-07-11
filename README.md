# 🎸 ProgDealer

**ProgDealer** is a web app dedicated to discovering and tracking progressive rock, metal, and alternative music events across Europe.  
Users can report concerts, save their favorite bands and cities, and receive updates on cult live shows.

---

## 🚀 Features

- 🧠 **AI-assisted scraping** of events from multiple sources (starting with [Concertful](https://concertful.com))
- 📅 **Event database** powered by Supabase
- 🧾 **User authentication** with email/password and email confirmation
- 💌 **Transactional emails** via Resend (signup confirmation, password reset, account deletion)
- 🛠️ **Admin interface** to moderate events
- 🌈 **Custom frontend** built with Vite + React + Tailwind

---

## 📦 Tech Stack

| Layer              | Tech                      |
|-------------------|---------------------------|
| Frontend          | React, Vite, TailwindCSS  |
| Backend Functions | Supabase Edge Functions   |
| Auth              | Supabase Auth             |
| DB                | Supabase Postgres         |
| Email             | Resend API                |
| Hosting           | Netlify                   |
| Automation        | Bolt.new                  |

---

## 🧪 Local Development

```bash
git clone https://github.com/your-username/progdealer.git
cd progdealer
npm install
npm run dev
📝 You'll need to configure your .env file with:

VITE_SUPABASE_URL=...

VITE_SUPABASE_ANON_KEY=...

SUPABASE_SERVICE_ROLE_KEY=... (for functions)

RESEND_API_KEY=...

💾 Deployment
Frontend is auto-deployed via Netlify (npm run build)

Functions live in Supabase Edge (Deno runtime)

GitHub is the source of truth for production


🤝 Contributing
We welcome contributions via GitHub Pull Requests or directly via Bolt.new's AI integration.

🧙‍♂️ Project Philosophy
ProgDealer is more than a scraper — it’s a music ritual for lovers of King Crimson, Opeth, Leprous, and every odd time signature out there.

📬 Contact
Feel free to reach out via hello@progdealer.online
