import requests
from bs4 import BeautifulSoup

def estrai_eventi():
    url = "https://www.eventbrite.it/d/italy/progressive-rock/"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }
    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, 'html.parser')

    eventi_trovati = soup.select("div.search-event-card-wrapper")
    print(f"Numero eventi trovati: {len(eventi_trovati)}")

    for item in eventi_trovati:
        try:
            nome = item.select_one(".eds-event-card__formatted-name--is-clamped")
            if nome:
                print("Evento trovato:", nome.text.strip())
        except Exception as e:
            print("Errore su un evento:", e)

if __name__ == "__main__":
    estrai_eventi()
