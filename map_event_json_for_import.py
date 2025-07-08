#!/usr/bin/env python3
import json
import sys
from dateutil import parser

def main():
    try:
        # Read JSON from stdin or file argument
        if len(sys.argv) > 1:
            input_file = sys.argv[1]
            with open(input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = json.load(sys.stdin)

        mapped_events = []
        
        # Ensure data is a list
        events_list = data if isinstance(data, list) else [data]
        
        for event in events_list:
            try:
                # Extract event name
                nome_evento = (event.get('name') or event.get('nome_evento') or '').strip()
                if not nome_evento:
                    continue
                
                # Extract and normalize date
                data_ora = event.get('startDate') or event.get('data_ora') or ''
                if not data_ora:
                    continue
                
                try:
                    # Parse and normalize date to ISO format
                    parsed_date = parser.parse(data_ora)
                    data_ora_norm = parsed_date.isoformat()
                except Exception:
                    continue
                
                # Extract location information
                location = event.get('location', {})
                if isinstance(location, dict):
                    venue = (location.get('name') or '').strip()
                    address = location.get('address', {})
                    if isinstance(address, dict):
                        città = (address.get('addressLocality') or address.get('city') or '').strip()
                    else:
                        città = (location.get('city') or '').strip()
                else:
                    venue = str(location or '').strip()
                    città = (event.get('city') or '').strip()
                
                # Extract other fields with fallbacks
                sottogenere = (event.get('subgenre') or event.get('sottogenere') or 'Progressive').strip()
                descrizione = event.get('description') or event.get('descrizione')
                artisti = event.get('artists') or event.get('artisti')
                orario = event.get('time') or event.get('orario')
                link = event.get('url') or event.get('link') or ''
                immagine = event.get('image') or event.get('immagine')
                fonte = event.get('fonte') or event.get('source') or 'import'
                tipo_inserimento = event.get('tipo_inserimento') or 'scraped'
                event_id = event.get('event_id') or event.get('id')
                
                # Create mapped event object
                mapped_event = {
                    "nome_evento": nome_evento,
                    "data_ora": data_ora_norm,
                    "venue": venue,
                    "città": città,
                    "sottogenere": sottogenere,
                    "descrizione": descrizione,
                    "artisti": artisti,
                    "orario": orario,
                    "link": link,
                    "immagine": immagine,
                    "fonte": fonte,
                    "tipo_inserimento": tipo_inserimento,
                    "event_id": event_id
                }
                
                # Remove null values to keep JSON clean
                mapped_event = {k: v for k, v in mapped_event.items() if v is not None and v != ''}
                
                mapped_events.append(mapped_event)
                
            except Exception as e:
                # Skip invalid events silently
                continue

        # Output the transformed JSON to stdout
        print(json.dumps(mapped_events, indent=2, ensure_ascii=False))
        
    except Exception as e:
        # Output error to stderr and exit with error code
        print(f"Error processing JSON: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()