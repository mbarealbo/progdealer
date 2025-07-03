import requests
from bs4 import BeautifulSoup

def estrai_eventi_bandsintown():
    url = "https://www.bandsintown.com/en/c/italy"
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, "html.parser")

    eventi = soup.select("a.event-link")
    print(f"Numero eventi trovati: {len(eventi)}")

    for e in eventi:
        try:
            titolo = e.select_one("div.event-title").text.strip() if e.select_one("div.event-title") else "Titolo sconosciuto"
            data = e.select_one("div.event-date").text.strip() if e.select_one("div.event-date") else "Data sconosciuta"
            luogo = e.select_one("div.event-venue").text.strip() if e.select_one("div.event-venue") else "Luogo sconosciuto"
            print(f"{titolo} – {data} – {luogo}")
        except Exception as err:
            print("Errore su evento:", err)

if __name__ == "__main__":
    estrai_eventi_bandsintown()
