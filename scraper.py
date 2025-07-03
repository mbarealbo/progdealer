import requests

def estrai_eventi_bandsintown():
    artist = "dream-theater"
    url = f"https://rest.bandsintown.com/artists/{artist}/events?app_id=progdealer"
    res = requests.get(url)

    if res.status_code != 200:
        print("Errore nella richiesta:", res.status_code)
        return

    eventi = res.json()
    print(f"Numero eventi trovati: {len(eventi)}")

    for e in eventi:
        nome = e.get("venue", {}).get("name", "Luogo sconosciuto")
        città = e.get("venue", {}).get("city", "Città sconosciuta")
        data = e.get("datetime", "Data sconosciuta")
        print(f"{nome} – {città} – {data}")

if __name__ == "__main__":
    estrai_eventi_bandsintown()
