import requests
from bs4 import BeautifulSoup

def estrai_eventi_songkick():
    url = "https://www.songkick.com/search?page=1&query=progressive+rock&type=upcoming"
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, 'html.parser')

    eventi = soup.select("li.concert")
    print(f"Numero eventi trovati: {len(eventi)}")

    for evento in eventi:
        try:
            nome_tag = evento.select_one("strong.summary")
            data_tag = evento.select_one("time")
            luogo_tag = evento.select_one("span.location")

            nome = nome_tag.text.strip() if nome_tag else "Nome sconosciuto"
            data = data_tag.text.strip() if data_tag else "Data sconosciuta"
            luogo = luogo_tag.text.strip() if luogo_tag else "Luogo sconosciuto"

            print(f"{nome} – {data} – {luogo}")
        except Exception as err:
            print("Errore su un evento:", err)

if __name__ == "__main__":
    estrai_eventi_songkick()
