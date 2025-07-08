/*
  # Add country field to events table

  1. New Column
    - `country` (text, optional) - Country name for better filtering
  
  2. Migration
    - Add country column to existing table
    - Update existing events with country information where possible
    - Add index for performance
*/

-- Add country column to eventi_prog table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eventi_prog' AND column_name = 'country'
  ) THEN
    ALTER TABLE eventi_prog ADD COLUMN country text;
  END IF;
END $$;

-- Update existing events with country information based on city names
UPDATE eventi_prog SET country = 'Italy' WHERE 
  lower(città) LIKE '%rome%' OR lower(città) LIKE '%milan%' OR lower(città) LIKE '%naples%' OR 
  lower(città) LIKE '%turin%' OR lower(città) LIKE '%palermo%' OR lower(città) LIKE '%genoa%' OR 
  lower(città) LIKE '%genova%' OR lower(città) LIKE '%bologna%' OR lower(città) LIKE '%florence%' OR 
  lower(città) LIKE '%firenze%' OR lower(città) LIKE '%bari%' OR lower(città) LIKE '%catania%' OR
  lower(città) LIKE '%venice%' OR lower(città) LIKE '%venezia%' OR lower(città) LIKE '%verona%' OR
  lower(città) LIKE '%padova%' OR lower(città) LIKE '%trieste%' OR lower(città) LIKE '%brescia%' OR
  lower(città) LIKE '%parma%' OR lower(città) LIKE '%modena%' OR lower(città) LIKE '%reggio%' OR
  lower(città) LIKE '%livorno%' OR lower(città) LIKE '%cagliari%' OR lower(città) LIKE '%perugia%' OR
  lower(città) LIKE '%pescara%' OR lower(città) LIKE '%foggia%' OR lower(città) LIKE '%salerno%' OR
  lower(città) LIKE '%sassari%' OR lower(città) LIKE '%bergamo%' OR lower(città) LIKE '%trento%' OR
  lower(città) LIKE '%vicenza%' OR lower(città) LIKE '%terni%' OR lower(città) LIKE '%bolzano%' OR
  lower(città) LIKE '%novara%' OR lower(città) LIKE '%piacenza%' OR lower(città) LIKE '%ancona%' OR
  lower(città) LIKE '%arezzo%' OR lower(città) LIKE '%udine%' OR lower(città) LIKE '%cesena%' OR
  lower(città) LIKE '%lecce%' OR lower(città) LIKE '%la spezia%' OR lower(città) LIKE '%rimini%' OR
  lower(città) LIKE '%siena%' OR lower(città) LIKE '%pistoia%' OR lower(città) LIKE '%como%' OR
  lower(città) LIKE '%varese%' OR lower(città) LIKE '%ravenna%' OR lower(città) LIKE '%ferrara%' OR
  lower(città) LIKE '%imperia%' OR lower(città) LIKE '%savona%' OR lower(città) LIKE '%massa%' OR
  lower(città) LIKE '%carrara%' OR lower(città) LIKE '%lucca%' OR lower(città) LIKE '%pisa%' OR
  lower(città) LIKE '%grosseto%' OR lower(città) LIKE '%viterbo%' OR lower(città) LIKE '%rieti%' OR
  lower(città) LIKE '%latina%' OR lower(città) LIKE '%frosinone%' OR lower(città) LIKE '%caserta%' OR
  lower(città) LIKE '%benevento%' OR lower(città) LIKE '%avellino%' OR lower(città) LIKE '%potenza%' OR
  lower(città) LIKE '%matera%' OR lower(città) LIKE '%cosenza%' OR lower(città) LIKE '%catanzaro%' OR
  lower(città) LIKE '%reggio calabria%' OR lower(città) LIKE '%trapani%' OR lower(città) LIKE '%messina%' OR
  lower(città) LIKE '%agrigento%' OR lower(città) LIKE '%caltanissetta%' OR lower(città) LIKE '%enna%' OR
  lower(città) LIKE '%ragusa%' OR lower(città) LIKE '%siracusa%';

UPDATE eventi_prog SET country = 'Netherlands' WHERE 
  lower(città) LIKE '%amsterdam%' OR lower(città) LIKE '%rotterdam%' OR lower(città) LIKE '%the hague%' OR 
  lower(città) LIKE '%utrecht%' OR lower(città) LIKE '%eindhoven%' OR lower(città) LIKE '%tilburg%' OR 
  lower(città) LIKE '%groningen%' OR lower(città) LIKE '%almere%' OR lower(città) LIKE '%breda%' OR 
  lower(città) LIKE '%nijmegen%' OR lower(città) LIKE '%enschede%' OR lower(città) LIKE '%haarlem%' OR
  lower(città) LIKE '%arnhem%' OR lower(città) LIKE '%zaanstad%' OR lower(città) LIKE '%s-hertogenbosch%' OR
  lower(città) LIKE '%apeldoorn%' OR lower(città) LIKE '%hoofddorp%' OR lower(città) LIKE '%maastricht%' OR
  lower(città) LIKE '%leiden%' OR lower(città) LIKE '%dordrecht%' OR lower(città) LIKE '%zoetermeer%' OR
  lower(città) LIKE '%zwolle%' OR lower(città) LIKE '%deventer%' OR lower(città) LIKE '%delft%' OR
  lower(città) LIKE '%leeuwarden%' OR lower(città) LIKE '%alkmaar%' OR lower(città) LIKE '%amersfoort%';

UPDATE eventi_prog SET country = 'Germany' WHERE 
  lower(città) LIKE '%berlin%' OR lower(città) LIKE '%munich%' OR lower(città) LIKE '%münchen%' OR 
  lower(città) LIKE '%hamburg%' OR lower(città) LIKE '%cologne%' OR lower(città) LIKE '%köln%' OR 
  lower(città) LIKE '%frankfurt%' OR lower(città) LIKE '%stuttgart%' OR lower(città) LIKE '%düsseldorf%' OR 
  lower(città) LIKE '%dortmund%' OR lower(città) LIKE '%essen%' OR lower(città) LIKE '%leipzig%' OR
  lower(città) LIKE '%bremen%' OR lower(città) LIKE '%dresden%' OR lower(città) LIKE '%hannover%' OR
  lower(città) LIKE '%nuremberg%' OR lower(città) LIKE '%nürnberg%' OR lower(città) LIKE '%duisburg%' OR
  lower(città) LIKE '%bochum%' OR lower(città) LIKE '%wuppertal%' OR lower(città) LIKE '%bielefeld%' OR
  lower(città) LIKE '%bonn%' OR lower(città) LIKE '%münster%' OR lower(città) LIKE '%karlsruhe%' OR
  lower(città) LIKE '%mannheim%' OR lower(città) LIKE '%augsburg%' OR lower(città) LIKE '%wiesbaden%' OR
  lower(città) LIKE '%gelsenkirchen%' OR lower(città) LIKE '%mönchengladbach%' OR lower(città) LIKE '%braunschweig%' OR
  lower(città) LIKE '%chemnitz%' OR lower(città) LIKE '%kiel%' OR lower(città) LIKE '%aachen%' OR
  lower(città) LIKE '%halle%' OR lower(città) LIKE '%magdeburg%' OR lower(città) LIKE '%freiburg%' OR
  lower(città) LIKE '%krefeld%' OR lower(città) LIKE '%lübeck%' OR lower(città) LIKE '%oberhausen%' OR
  lower(città) LIKE '%erfurt%' OR lower(città) LIKE '%mainz%' OR lower(città) LIKE '%rostock%' OR
  lower(città) LIKE '%kassel%' OR lower(città) LIKE '%hagen%' OR lower(città) LIKE '%potsdam%';

UPDATE eventi_prog SET country = 'France' WHERE 
  lower(città) LIKE '%paris%' OR lower(città) LIKE '%lyon%' OR lower(città) LIKE '%marseille%' OR 
  lower(città) LIKE '%toulouse%' OR lower(città) LIKE '%nice%' OR lower(città) LIKE '%nantes%' OR 
  lower(città) LIKE '%strasbourg%' OR lower(città) LIKE '%montpellier%' OR lower(città) LIKE '%bordeaux%' OR 
  lower(città) LIKE '%lille%' OR lower(città) LIKE '%rennes%' OR lower(città) LIKE '%reims%' OR
  lower(città) LIKE '%le havre%' OR lower(città) LIKE '%saint-étienne%' OR lower(città) LIKE '%toulon%' OR
  lower(città) LIKE '%angers%' OR lower(città) LIKE '%grenoble%' OR lower(città) LIKE '%dijon%' OR
  lower(città) LIKE '%nîmes%' OR lower(città) LIKE '%aix-en-provence%' OR lower(città) LIKE '%brest%' OR
  lower(città) LIKE '%le mans%' OR lower(città) LIKE '%amiens%' OR lower(città) LIKE '%tours%' OR
  lower(città) LIKE '%limoges%' OR lower(città) LIKE '%clermont-ferrand%' OR lower(città) LIKE '%villeurbanne%' OR
  lower(città) LIKE '%besançon%' OR lower(città) LIKE '%orléans%' OR lower(città) LIKE '%metz%' OR
  lower(città) LIKE '%rouen%' OR lower(città) LIKE '%mulhouse%' OR lower(città) LIKE '%perpignan%' OR
  lower(città) LIKE '%caen%' OR lower(città) LIKE '%boulogne-billancourt%' OR lower(città) LIKE '%nancy%';

UPDATE eventi_prog SET country = 'United Kingdom' WHERE 
  lower(città) LIKE '%london%' OR lower(città) LIKE '%manchester%' OR lower(città) LIKE '%birmingham%' OR 
  lower(città) LIKE '%liverpool%' OR lower(città) LIKE '%bristol%' OR lower(città) LIKE '%leeds%' OR 
  lower(città) LIKE '%glasgow%' OR lower(città) LIKE '%edinburgh%' OR lower(città) LIKE '%cardiff%' OR
  lower(città) LIKE '%sheffield%' OR lower(città) LIKE '%bradford%' OR lower(città) LIKE '%leicester%' OR
  lower(città) LIKE '%coventry%' OR lower(città) LIKE '%nottingham%' OR lower(città) LIKE '%hull%' OR
  lower(città) LIKE '%newcastle%' OR lower(città) LIKE '%belfast%' OR lower(città) LIKE '%stoke%' OR
  lower(città) LIKE '%wolverhampton%' OR lower(città) LIKE '%plymouth%' OR lower(città) LIKE '%derby%' OR
  lower(città) LIKE '%swansea%' OR lower(città) LIKE '%southampton%' OR lower(città) LIKE '%salford%' OR
  lower(città) LIKE '%aberdeen%' OR lower(città) LIKE '%westminster%' OR lower(città) LIKE '%reading%' OR
  lower(città) LIKE '%luton%' OR lower(città) LIKE '%york%' OR lower(città) LIKE '%stockport%' OR
  lower(città) LIKE '%brighton%' OR lower(città) LIKE '%oxford%' OR lower(città) LIKE '%cambridge%' OR
  lower(città) LIKE '%bournemouth%' OR lower(città) LIKE '%swindon%' OR lower(città) LIKE '%huddersfield%';

UPDATE eventi_prog SET country = 'Spain' WHERE 
  lower(città) LIKE '%madrid%' OR lower(città) LIKE '%barcelona%' OR lower(città) LIKE '%valencia%' OR 
  lower(città) LIKE '%seville%' OR lower(città) LIKE '%sevilla%' OR lower(città) LIKE '%zaragoza%' OR 
  lower(città) LIKE '%málaga%' OR lower(città) LIKE '%malaga%' OR lower(città) LIKE '%murcia%' OR 
  lower(città) LIKE '%palma%' OR lower(città) LIKE '%bilbao%' OR lower(città) LIKE '%alicante%' OR
  lower(città) LIKE '%córdoba%' OR lower(città) LIKE '%cordoba%' OR lower(città) LIKE '%valladolid%' OR
  lower(città) LIKE '%vigo%' OR lower(città) LIKE '%gijón%' OR lower(città) LIKE '%gijon%' OR
  lower(città) LIKE '%hospitalet%' OR lower(città) LIKE '%vitoria%' OR lower(città) LIKE '%granada%' OR
  lower(città) LIKE '%elche%' OR lower(città) LIKE '%oviedo%' OR lower(città) LIKE '%badalona%' OR
  lower(città) LIKE '%cartagena%' OR lower(città) LIKE '%terrassa%' OR lower(città) LIKE '%jerez%' OR
  lower(città) LIKE '%sabadell%' OR lower(città) LIKE '%móstoles%' OR lower(città) LIKE '%mostoles%' OR
  lower(città) LIKE '%alcalá%' OR lower(città) LIKE '%alcala%' OR lower(città) LIKE '%pamplona%' OR
  lower(città) LIKE '%fuenlabrada%' OR lower(città) LIKE '%almería%' OR lower(città) LIKE '%almeria%';

UPDATE eventi_prog SET country = 'Belgium' WHERE 
  lower(città) LIKE '%brussels%' OR lower(città) LIKE '%bruxelles%' OR lower(città) LIKE '%antwerp%' OR 
  lower(città) LIKE '%antwerpen%' OR lower(città) LIKE '%ghent%' OR lower(città) LIKE '%gent%' OR 
  lower(città) LIKE '%charleroi%' OR lower(città) LIKE '%liège%' OR lower(città) LIKE '%liege%' OR 
  lower(città) LIKE '%bruges%' OR lower(città) LIKE '%brugge%' OR lower(città) LIKE '%namur%' OR 
  lower(città) LIKE '%leuven%' OR lower(città) LIKE '%mons%' OR lower(città) LIKE '%aalst%' OR
  lower(città) LIKE '%mechelen%' OR lower(città) LIKE '%la louvière%' OR lower(città) LIKE '%kortrijk%' OR
  lower(città) LIKE '%hasselt%' OR lower(città) LIKE '%sint-niklaas%' OR lower(città) LIKE '%tournai%' OR
  lower(città) LIKE '%genk%' OR lower(città) LIKE '%seraing%' OR lower(città) LIKE '%roeselare%' OR
  lower(città) LIKE '%verviers%' OR lower(città) LIKE '%mouscron%' OR lower(città) LIKE '%beveren%';

-- Add more countries as needed
UPDATE eventi_prog SET country = 'Switzerland' WHERE 
  lower(città) LIKE '%zurich%' OR lower(città) LIKE '%geneva%' OR lower(città) LIKE '%basel%' OR 
  lower(città) LIKE '%bern%' OR lower(città) LIKE '%lausanne%' OR lower(città) LIKE '%winterthur%' OR 
  lower(città) LIKE '%lucerne%' OR lower(città) LIKE '%st. gallen%' OR lower(città) LIKE '%lugano%' OR 
  lower(città) LIKE '%biel%' OR lower(città) LIKE '%thun%' OR lower(città) LIKE '%köniz%' OR
  lower(città) LIKE '%schaffhausen%' OR lower(città) LIKE '%fribourg%' OR lower(città) LIKE '%chur%';

UPDATE eventi_prog SET country = 'Austria' WHERE 
  lower(città) LIKE '%vienna%' OR lower(città) LIKE '%wien%' OR lower(città) LIKE '%graz%' OR 
  lower(città) LIKE '%linz%' OR lower(città) LIKE '%salzburg%' OR lower(città) LIKE '%innsbruck%' OR 
  lower(città) LIKE '%klagenfurt%' OR lower(città) LIKE '%villach%' OR lower(città) LIKE '%wels%' OR 
  lower(città) LIKE '%sankt pölten%' OR lower(città) LIKE '%dornbirn%' OR lower(città) LIKE '%steyr%';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS eventi_prog_country_idx ON eventi_prog (country);