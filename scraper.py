import requests
from bs4 import BeautifulSoup

def estrai_eventi_songkick():
    url = "https://www.songkick.com/search?page=1&query=progressive+rock&type=upcoming"
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, 'html.parser')

    eventi = soup.select("li.concert")
    print(f"Numero eventi trovati: {len(eventi)}")

    for e in eventi:
        try:
            nome = e.select_one("strong.summary").text.strip()
            data = e.select_one("time").text.strip()
            luogo = e.select_one("span.location").text.strip()
            print(f"{nome} – {data} – {luogo}")
        except Exception as err:
            print("Errore su un evento:", err)

if __name__ == "__main__":
    estrai_eventi_songkick()
