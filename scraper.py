import requests
from bs4 import BeautifulSoup

def estrai_eventi_songkick():
    url = "https://www.songkick.com/search?page=1&query=progressive+rock&type=upcoming"
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, 'html.parser')

    eventi = soup.select("li.search-result.event")
    print(f"Numero eventi trovati: {len(eventi)}")

    for evento in eventi:
        try:
            artista = evento.select_one("p.artists a")
            data = evento.select_one("time")
            venue = evento.select_one("p.location")
            
            artista_txt = artista.text.strip() if artista else "Artista sconosciuto"
            data_txt = data.text.strip() if data else "Data sconosciuta"
            venue_txt = venue.text.strip() if venue else "Luogo sconosciuto"

            print(f"{artista_txt} – {data_txt} – {venue_txt}")
        except Exception as err:
            print("Errore su un evento:", err)

if __name__ == "__main__":
    estrai_eventi_songkick()
