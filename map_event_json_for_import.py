import json
from dateutil import parser

def map_event_json_for_import(input_file, output_file):
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    mapped_events = []
    for event in data:
        try:
            nome_evento = event.get('name', '').strip()
            # Cerca la data evento
            data_ora = event.get('startDate', '') or event.get('data_ora', '')
            if not data_ora:
                continue
            # Normalizza data
            try:
                data_ora_norm = parser.parse(data_ora).isoformat()
            except Exception:
                continue
            # Venue/location: gestisce sia dict che stringa
            location = event.get('location', {})
            if isinstance(location, dict):
                venue = location.get('name', '').strip()
                città = location.get('address', {}).get('addressLocality', '').strip()
            else:
                venue = location
                città = event.get('city', '').strip()
            # Altri campi
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

    with open(output_file, 'w') as f:
        json.dump(mapped_events, f, indent=2)

# Esempio di esecuzione:
# map_event_json_for_import("eventi_ldjson_prog_all.json", "eventi_bolt_ready.json")
