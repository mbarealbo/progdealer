# 🎸 ProgDealer

**ProgDealer** is a web platform for discovering, tracking, and contributing progressive rock, metal, and alternative music events across Europe.

The platform empowers fans to report rare concerts, save their favorite bands and cities, and stay updated on cult live shows — from King Crimson-style revivals to underground Opeth-inspired gigs.

---

## 🚀 What It Does

- 🧠 **AI-powered scraping**: automated aggregation of events from multiple sources (starting with Concertful, more coming soon)
- 📅 **Event database**: fully structured and filtered event storage using Supabase
- 🔐 **User authentication**: secure sign-up/login with email or Google, backed by Supabase Auth
- 💌 **Transactional emails**: welcome, password reset, and account deletion flows via Resend
- 🛡️ **Role-based moderation**: admin tools for validating and editing event reports
- 📲 **Mobile-optimized frontend**: sleek and responsive UI built with Bolt.new + Tailwind
- 🎛️ **RLS security**: Supabase policies to ensure users only access their own data
- 🧪 **End-to-end testing pipeline**: from registration to event publishing and moderation

---

## 🛠️ Tech Stack

| Layer              | Technology                  |
|--------------------|-----------------------------|
| Frontend           | React, Vite, TailwindCSS    |
| Backend Functions  | Supabase Edge Functions     |
| Authentication     | Supabase Auth (OAuth + Email) |
| Database           | Supabase Postgres (RLS-secured) |
| Email              | Resend API                  |
| Hosting            | Netlify                     |
| Admin Automation   | Bolt.new                    |

---

## 💡 Vision

ProgDealer was born from a simple need: stop missing niche concerts.

In a world of overpromoted mainstream events, progressive music fans are often left without reliable platforms to track obscure gigs. ProgDealer aims to fix that — **not by replacing event websites**, but by **connecting them intelligently**, combining community reports and scraping to create a rich, curated ecosystem of live shows.

It’s for fans who still believe that a 15-minute track with a flute solo deserves to be heard live.

---

## 🤝 Contributing

We welcome contributions through GitHub Pull Requests or directly via [Bolt.new](https://bolt.new)'s AI-integrated editor.

Before contributing, please open an issue or reach out so we can align on priorities. We're currently focusing on:

- Adding new scraping sources
- Improving mobile UX
- Extending user profiles and preferences

---

## 📬 Contact

Questions, suggestions, bug reports?  
Drop us a line at [hello@progdealer.com](mailto:hello@progdealer.com)

---

_Last updated: July 24, 2025 – Project in active development_
