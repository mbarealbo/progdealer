import json
import sys
from dateutil import parser

def main():
    # Carica il file JSON dalla stdin (o come primo argomento, a seconda dell'ambiente)
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        with open(input_file, 'r') as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)

    mapped_events = []
    for event in data:
        try:
            nome_evento = event.get('name', '').strip()
            data_ora = event.get('startDate', '') or event.get('data_ora', '')
            if not data_ora:
                continue
            try:
                data_ora_norm = parser.parse(data_ora).isoformat()
            except Exception:
                continue
            location = event.get('location', {})
            if isinstance(location, dict):
                venue = location.get('name', '').strip()
                città = location.get('address', {}).get('addressLocality', '').strip()
            else:
                venue = location
                città = event.get('city', '').strip()
            sottogenere = event.get('subgenre', event.get('sottogenere', 'Prog')).strip()
            link = event.get('url', event.get('link', ''))
            fonte = event.get('fonte', 'concertful.com')
            tipo_inserimento = event.get('tipo_inserimento', 'scraped')
            mapped = {
                "nome_evento": nome_evento,
                "data_ora": data_ora_norm,
                "venue": venue,
                "città": città,
                "sottogenere": sottogenere,
                "link": link,
                "fonte": fonte,
                "tipo_inserimento": tipo_inserimento
            }
            mapped_events.append(mapped)
        except Exception:
            continue

    # Invece di scrivere su file, stampa il risultato
    print(json.dumps(mapped_events, indent=2))

if __name__ == "__main__":
    main()
