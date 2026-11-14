// Start Deutsch 1 exam practice.

// Sprechen Teil 1: introduce yourself. [key, keyword, examiner question, sentence frame]
export const INTRO = [
  ['name', 'Name', 'Wie heißen Sie?', 'Ich heiße …'],
  ['alter', 'Alter', 'Wie alt sind Sie?', 'Ich bin … Jahre alt.'],
  ['land', 'Land', 'Woher kommen Sie?', 'Ich komme aus …'],
  ['wohnort', 'Wohnort', 'Wo wohnen Sie?', 'Ich wohne in …'],
  ['sprachen', 'Sprachen', 'Welche Sprachen sprechen Sie?', 'Ich spreche …'],
  ['beruf', 'Beruf', 'Was sind Sie von Beruf?', 'Ich bin … von Beruf.'],
  ['hobby', 'Hobby', 'Was sind Ihre Hobbys?', 'Mein Hobby ist …'],
  ['familie', 'Familie', 'Haben Sie Familie?', 'Ich bin verlobt. / Ich habe …'],
];

// Schreiben Teil 1: read a short text, fill in a form. Field: [label, english, accepted answers]
export const FORMS = [
  { text: 'Ich heiße Maria Santos. Ich komme aus Brasilien und bin 29 Jahre alt. Ich wohne jetzt in Köln. Ich bin verheiratet und habe ein Kind.',
    fields: [
      ['Familienname', 'surname', ['Santos']],
      ['Vorname', 'first name', ['Maria']],
      ['Herkunftsland', 'country of origin', ['Brasilien']],
      ['Alter', 'age', ['29', '29 Jahre']],
      ['Familienstand', 'marital status', ['verheiratet']],
    ] },
  { text: 'Mein Name ist Ali Yilmaz. Ich bin in Ankara geboren. Ich arbeite als Koch in einem Restaurant. Meine Telefonnummer ist 0176 554433. Ich bin ledig.',
    fields: [
      ['Familienname', 'surname', ['Yilmaz']],
      ['Geburtsort', 'place of birth', ['Ankara']],
      ['Beruf', 'profession', ['Koch']],
      ['Telefon', 'phone', ['0176 554433', '0176554433']],
      ['Familienstand', 'marital status', ['ledig']],
    ] },
  { text: 'Guten Tag, mein Name ist Petra Klein. Ich möchte ein Einzelzimmer vom 3. bis 5. Mai. Ich komme mit dem Zug und bezahle mit Kreditkarte.',
    fields: [
      ['Name', 'name', ['Klein', 'Petra Klein']],
      ['Zimmer', 'room', ['Einzelzimmer']],
      ['Anreise', 'arrival', ['3. Mai', '3.5.', '03.05.', '3.5', '3 Mai']],
      ['Nächte', 'nights', ['2', 'zwei']],
      ['Zahlung', 'payment', ['Kreditkarte', 'mit Kreditkarte']],
    ] },
  { text: 'Ich heiße Lucas Oliveira und wohne in 50667 Köln. Ich möchte einen Deutschkurs am Abend machen. Ich spreche Portugiesisch und ein bisschen Englisch.',
    fields: [
      ['Vorname', 'first name', ['Lucas']],
      ['Familienname', 'surname', ['Oliveira']],
      ['Postleitzahl', 'postcode', ['50667']],
      ['Kurszeit', 'course time', ['Abend', 'am Abend', 'abends']],
      ['Muttersprache', 'native language', ['Portugiesisch']],
    ] },
  { text: 'Anna Weber ist 34 Jahre alt. Sie ist Lehrerin und möchte im Sportverein Tennis spielen. Sie hat am Samstag und am Sonntag Zeit.',
    fields: [
      ['Familienname', 'surname', ['Weber']],
      ['Alter', 'age', ['34', '34 Jahre']],
      ['Beruf', 'profession', ['Lehrerin']],
      ['Sportart', 'sport', ['Tennis']],
      ['Wann?', 'when?', ['Samstag und Sonntag', 'am Samstag und am Sonntag', 'Samstag, Sonntag', 'am Wochenende', 'Wochenende']],
    ] },
];

// Sprechen Teil 2 (ask about a word) and Teil 3 (make a request). [theme, word, question/request, sample answer]
export const SPEAK = [
  ['Essen und Trinken', 'Frühstück', 'Was essen Sie zum Frühstück?', 'Ich esse Brötchen mit Marmelade.'],
  ['Essen und Trinken', 'Lieblingsessen', 'Was ist Ihr Lieblingsessen?', 'Mein Lieblingsessen ist Pizza.'],
  ['Essen und Trinken', 'Kaffee', 'Trinken Sie gern Kaffee?', 'Ja, ich trinke jeden Morgen Kaffee.'],
  ['Essen und Trinken', 'Restaurant', 'Gehen Sie oft ins Restaurant?', 'Nein, ich koche lieber zu Hause.'],
  ['Essen und Trinken', 'Obst', 'Welches Obst essen Sie gern?', 'Ich esse gern Äpfel und Bananen.'],
  ['Einkaufen', 'Supermarkt', 'Wo kaufen Sie Lebensmittel?', 'Im Supermarkt.'],
  ['Einkaufen', 'Kleidung', 'Wo kaufen Sie Kleidung?', 'Ich kaufe Kleidung im Internet.'],
  ['Einkaufen', 'Preis', 'Wie viel kostet die Jacke?', 'Sie kostet 49 Euro.'],
  ['Einkaufen', 'Geschenk', 'Was kaufen Sie als Geschenk?', 'Ich kaufe Blumen.'],
  ['Einkaufen', 'Samstag', 'Kaufen Sie am Samstag ein?', 'Ja, am Samstag habe ich Zeit.'],
  ['Wohnen', 'Wohnung', 'Wie groß ist Ihre Wohnung?', 'Sie hat drei Zimmer.'],
  ['Wohnen', 'Küche', 'Ist Ihre Küche groß?', 'Nein, sie ist klein.'],
  ['Wohnen', 'Balkon', 'Haben Sie einen Balkon?', 'Ja, einen kleinen Balkon.'],
  ['Wohnen', 'Miete', 'Wie hoch ist die Miete?', 'Die Miete ist 800 Euro.'],
  ['Wohnen', 'Nachbarn', 'Kennen Sie Ihre Nachbarn?', 'Ja, sie sind sehr nett.'],
  ['Freizeit', 'Sport', 'Machen Sie Sport?', 'Ja, ich schwimme gern.'],
  ['Freizeit', 'Kino', 'Gehen Sie gern ins Kino?', 'Ja, am Wochenende.'],
  ['Freizeit', 'Musik', 'Welche Musik hören Sie gern?', 'Ich höre gern Samba.'],
  ['Freizeit', 'Wochenende', 'Was machen Sie am Wochenende?', 'Ich treffe Freunde.'],
  ['Freizeit', 'Buch', 'Lesen Sie gern Bücher?', 'Ja, ich lese abends.'],
  ['Reisen', 'Urlaub', 'Wohin fahren Sie im Urlaub?', 'Ich fahre nach Brasilien.'],
  ['Reisen', 'Zug', 'Fahren Sie oft mit dem Zug?', 'Ja, ich fahre mit dem Zug zur Arbeit.'],
  ['Reisen', 'Hotel', 'Wo übernachten Sie im Urlaub?', 'In einem Hotel am Meer.'],
  ['Reisen', 'Fahrkarte', 'Wo kann ich eine Fahrkarte kaufen?', 'Am Automaten.'],
  ['Reisen', 'Gepäck', 'Haben Sie viel Gepäck?', 'Nein, nur einen Koffer.'],
  ['Bitten', 'Fenster', 'Können Sie bitte das Fenster öffnen?', 'Ja, gern.'],
  ['Bitten', 'Wasser', 'Ein Glas Wasser, bitte.', 'Hier, bitte.'],
  ['Bitten', 'Stift', 'Können Sie mir bitte einen Stift geben?', 'Natürlich.'],
  ['Bitten', 'langsam', 'Können Sie bitte langsamer sprechen?', 'Ja, natürlich.'],
  ['Bitten', 'Rechnung', 'Die Rechnung, bitte.', 'Das macht zwölf Euro.'],
];
