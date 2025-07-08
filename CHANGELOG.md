# ProgDealer v2.0 - System Update

## Database Schema Changes

### New Table Structure (`eventi_prog`)
- **nome_evento** (text, required) - Event name
- **data_ora** (timestamptz, required) - Event date and time  
- **venue** (text, required) - Venue name
- **città** (text, required) - City name (renamed from `luogo`)
- **sottogenere** (text, required) - Progressive subgenre classification with auto-detection
- **descrizione** (text, optional) - Event description
- **artisti** (text[], optional) - Array of artists
- **orario** (text, optional) - Time information (e.g., "DOORS 20:00, START 21:00")
- **link** (text, required) - Event link (renamed from `link_biglietti`)
- **immagine** (text, optional) - Event image URL
- **fonte** (text, required) - Data source (e.g., "concertful.com", "bandsintown")
- **tipo_inserimento** (text, required) - "scraped" or "manual"
- **event_id** (text, optional) - Unique ID from source for better deduplication

## Deduplication System

### Primary Deduplication Rule
Events are considered duplicates based on the unique combination of:
- `nome_evento` (event name)
- `data_ora` (date and time)
- `venue` (venue name)

### Secondary Deduplication
- Optional unique constraint on `event_id` when available from source
- Upsert function automatically updates existing events instead of creating duplicates

### Database Function
- `upsert_evento()` - Handles intelligent insert/update logic with deduplication

## Subgenre Classification System

### Auto-Detection Keywords
Intelligent classification based on event names, descriptions, and artists:
- **Prog Metal**: metal, dream theater, tool, opeth, mastodon, gojira
- **Krautrock**: neu!, kraftwerk, can, motorik, kraut, german
- **Canterbury Scene**: soft machine, caravan, gong, canterbury
- **Zeuhl**: magma, univers zero, zeuhl, kobaïan
- **Italian Prog**: pfm, banco, area, italian
- **Neo-Prog**: marillion, pendragon, iq, neo
- **Symphonic Prog**: yes, genesis, king crimson, emerson, symphonic, orchestra
- **Space Rock**: hawkwind, pink floyd, space, cosmic
- **Post-Rock**: godspeed, explosions, mogwai, post-rock, instrumental
- **Math Rock**: math, don caballero, battles, complex
- **Psychedelic Prog**: psychedelic, psych, acid, tame impala
- **Progressive Electronic**: electronic, synth, ambient, tangerine dream
- **Fusion**: fusion, jazz, mahavishnu, weather report
- **Avant-Prog**: avant, experimental, henry cow, art rock
- **RIO**: rio, henry cow, art bears, opposition

### Fallback
- Default to "Progressive" when no specific subgenre is detected

## Filter System Updates

### New Filter Interface
- **Collapsed by default** - Opens via filter icon with active filter count badge
- **Chip-based subgenre filtering** - Visual chips that can be removed to exclude subgenres
- **No dropdown selects** - All interactions via buttons and chips for better UX
- **Source filtering** - Filter by data source (concertful.com, bandsintown, etc.)
- **Entry type filtering** - Filter by scraped vs manual entries

### Filter Categories
1. **Progressive Subgenres** - Chip interface for inclusion/exclusion
2. **Location** - City-based filtering
3. **Date Range** - From/to date selection
4. **Source** - Data source filtering
5. **Entry Type** - Manual vs scraped filtering

## Import System

### JSON Import Feature
- **Bulk import** via JSON array upload
- **Automatic field mapping** from various source formats
- **Deduplication** during import process
- **Subgenre auto-classification** for imported events
- **Import results** with success/failure reporting

### Supported Import Fields
```json
{
  "nome_evento": "Event Name",
  "data_ora": "2025-01-15T20:00:00",
  "venue": "Venue Name", 
  "città": "City",
  "sottogenere": "Prog Metal", // Optional - auto-detected if missing
  "descrizione": "Event description",
  "artisti": ["Artist 1", "Artist 2"],
  "orario": "DOORS 20:00, START 21:00",
  "link": "https://example.com",
  "immagine": "https://example.com/image.jpg",
  "fonte": "concertful.com",
  "tipo_inserimento": "scraped",
  "event_id": "unique-source-id"
}
```

## Multi-Source Architecture

### Extensible Pipeline
- **Source identification** via `fonte` field
- **Entry type tracking** via `tipo_inserimento` field
- **Unique source IDs** via `event_id` field for better deduplication
- **Ready for integration** with Concertful, Meetup, Bandsintown, etc.

### Data Source Standards
- All sources must populate `fonte` with domain/service name
- All sources must set `tipo_inserimento` to "scraped"
- Sources should provide `event_id` when available for better deduplication

## UI/UX Improvements

### Event Cards
- **Condensed layout** for better space efficiency
- **Thumbnail images** with fallback to guitar emoji + "PROGDEALER" overlay
- **Source badges** showing data origin (manual vs source name)
- **Subgenre icons** for visual categorization
- **Artist display** with truncation for long lists
- **Mobile-responsive** design maintained

### Dark Theme Consistency
- Maintained underground/industrial aesthetic
- Consistent border styles and color scheme
- Improved contrast and readability

## Security & Performance

### Row Level Security (RLS)
- Public read access for all events
- Authenticated users can insert/update/delete
- Public users can insert manual events only

### Database Indexes
- Performance indexes on date, city, subgenre, source, and entry type
- Unique indexes for deduplication constraints
- Optimized for filtering and sorting operations

## Migration Notes

### Breaking Changes
- Table structure completely rebuilt
- Field names changed (`luogo` → `città`, `genere` → `sottogenere`, `link_biglietti` → `link`)
- New required fields (`sottogenere`, `fonte`, `tipo_inserimento`)

### Data Migration
- Existing data will need to be migrated to new schema
- Subgenre classification should be applied to existing events
- Source information should be backfilled where possible