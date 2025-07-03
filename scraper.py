import requests
from bs4 import BeautifulSoup

def estrai_eventi_songkick():
    url = "https://www.songkick.com/metro-areas/28714-italy-concerts"
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, 'html.parser')

    eventi = soup.select("li.event-listing")
    print(f"Numero eventi trovati: {len(eventi)}")

    for evento in eventi:
        try:
            artista = evento.select_one("strong.artists").text.strip() if evento.select_one("strong.artists") else "Artista sconosciuto"
            data = evento.select_one("time").text.strip() if evento.select_one("time") else "Data sconosciuta"
            luogo = evento.select_one("span.location").text.strip() if evento.select_one("span.location") else "Luogo sconosciuto"
            print(f"{artista} – {data} – {luogo}")
        except Exception as err:
            print("Errore su un evento:", err)

if __name__ == "__main__":
    estrai_eventi_songkick()
