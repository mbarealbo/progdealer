import requests
from bs4 import BeautifulSoup
from datetime import datetime
import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def estrai_eventi_eventbrite():
    url = "https://www.eventbrite.it/d/italy/progressive-rock/"
    res = requests.get(url)
    soup = BeautifulSoup(res.text, 'html.parser')
    eventi = []
    for item in soup.select("div.search-event-card-wrapper"):
        try:
            nome = item.select_one(".eds-event-card__formatted-name--is-clamped").text.strip()
            data = item.select_one(".eds-event-card-content__sub-title").text.strip()
            link = item.select_one("a.eds-event-card-content__action-link")['href']
            evento = {
                "nome_evento": nome,
                "data_ora": converti_data(data),
                "luogo": "Italia",
                "venue": "",
                "genere": "Progressive Rock",
                "link_biglietti": link,
                "fonte": "Scraping"
            }
            eventi.append(evento)
        except Exception:
            continue
    return eventi

def converti_data(data_str):
    try:
        # esempio: "gio, 5 set · 20:00 CEST"
        parts = data_str.split("·")
        giorno = parts[0].strip()
        ora = parts[1].strip() if len(parts) > 1 else "20:00"
        dt = datetime.strptime(f"{giorno} {datetime.now().year} {ora}", "%a, %d %b %Y %H:%M")
        return dt.isoformat()
    except:
        return None

def invia_a_supabase(eventi):
    for e in eventi:
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/eventi_prog",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            json=e
        )
        print(res.status_code, res.text)

if __name__ == "__main__":
    eventi = estrai_eventi_eventbrite()
    invia_a_supabase(eventi)
