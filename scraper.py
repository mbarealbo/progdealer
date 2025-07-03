import requests

def estrai_eventi_eventbrite():
    # Esempio: eventi a Roma, categoria musica
    url = "https://www.eventbrite.it/d/italy--roma/music--events/"
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(url, headers=headers)

    if res.status_code != 200:
        print("Errore nella richiesta:", res.status_code)
        return

    if "event-listing" not in res.text:
        print("Nessun evento trovato (markup diverso o blocco)")
        return

    from bs4 import BeautifulSoup
    soup = BeautifulSoup(res.text, "html.parser")
    eventi_html = soup.select("div.eds-event-card-content__content")

    print(f"Numero eventi trovati: {len(eventi_html)}")

    for e in eventi_html:
        try:
            titolo = e.select_one("div.eds-event-card-content__title").text.strip() if e.select_one("div.eds-event-card-content__title") else "Titolo sconosciuto"
            data = e.select_one("div.eds-text-bs--fixed").text.strip() if e.select_one("div.eds-text-bs--fixed") else "Data sconosciuta"
            print(f"{titolo} – {data}")
        except Exception as err:
            print("Errore su evento:", err)

if __name__ == "__main__":
    estrai_eventi_eventbrite()
