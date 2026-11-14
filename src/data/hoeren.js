// Listening comprehension in the style of Start Deutsch 1, Hören: short announcements and phone messages.
// Self-written templates (the real exam texts are copyrighted). Each call returns a fresh random task:
// { text, question, en, options, answer, said, stmt } where `said` is how the answer is spoken in `text`
// and stmt(option) turns an option into a Richtig/Falsch statement.
// Variety: several wordings per template, and several templates ask about different facts of the same situation.
import { clockPhrase } from '../answer.js';

let rand = Math.random; // swapped for a seeded generator in makePool()
const rnd = n => rand() * n | 0;
const one = a => a[rnd(a.length)];
const two = a => { const x = one(a); let y; do y = one(a); while (y === x); return [x, y]; };
const three_ = a => { const [x, y] = two(a); let z; do z = one(a); while (z === x || z === y); return [x, y, z]; };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = s => s[0].toUpperCase() + s.slice(1);

// Times are minutes since midnight.
const T = (h, m = 0) => h * 60 + m;
const pickTime = (fromH, toH, step) => T(fromH + rnd(toH - fromH + 1), step * rnd(60 / step));
const otherTime = (t, fromH, toH, step) => { let u; do u = pickTime(fromH, toH, step); while (u === t); return u; };
const fmt24 = t => `${t / 60 | 0}:${String(t % 60).padStart(2, '0')}`;
const official = t => `${t / 60 | 0} Uhr${t % 60 ? ' ' + (t % 60) : ''}`;   // "10 Uhr 45" (announcements)
const everyday = t => clockPhrase((t / 60 | 0) % 12 || 12, t % 60);         // "Viertel vor elf" (people)
const euro = c => `${c / 100 | 0},${String(c % 100).padStart(2, '0')} €`;
const sayEuro = c => (c / 100 | 0) ? `${c / 100 | 0} Euro${c % 100 ? ' ' + (c % 100) : ''}` : `${c % 100} Cent`;

// Answer + trap from the text + first unused near value, shuffled.
function three(answer, trap, near) {
  const out = [answer];
  for (const x of [trap, ...near]) if (out.length < 3 && x && !out.includes(x)) out.push(x);
  if (out.length < 3) throw new Error('not enough options for ' + answer);
  return shuffle(out);
}

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS = DAYS.slice(0, 5);
const CITIES = ['München', 'Hamburg', 'Berlin', 'Frankfurt', 'Köln', 'Stuttgart', 'Dresden', 'Leipzig'];
const TRAINS = ['ICE', 'IC', 'RE'];
const FRIENDS = ['Ana', 'Julia', 'Tom', 'Paula', 'Lukas', 'Sara', 'Marco', 'Lena'];
const SURNAMES = ['Silva', 'Becker', 'Schmidt', 'Costa', 'Weber', 'Klein', 'Fischer', 'Wagner'];
const MR = () => `${one(['Frau', 'Herr'])} ${one(SURNAMES)}`;
const PLACES = ['vor dem Kino', 'am Bahnhof', 'im Café am Markt', 'vor der Post', 'im Park'];
const ORD = { 1: 'ersten', 2: 'zweiten', 3: 'dritten', 4: 'vierten' };

const timeQ = ['Wann fährt der Zug heute?', 'When does the train leave today?'];

export const TEMPLATES = [
  function trainDelay() {
    const t1 = pickTime(6, 21, 5), d = one([10, 15, 20, 30]), t2 = t1 + d, tr = one(TRAINS), c = one(CITIES), g = 1 + rnd(12);
    const text = one([
      `Achtung an Gleis ${g}: Der ${tr} nach ${c}, Abfahrt ${official(t1)}, hat heute ${d} Minuten Verspätung. Neue Abfahrt: ${official(t2)}.`,
      `Information zum ${tr} nach ${c}: Der Zug fährt heute nicht um ${official(t1)}, sondern erst um ${official(t2)}. Wir bitten um Entschuldigung.`,
      `Liebe Fahrgäste, der ${tr} nach ${c} hat heute ${d} Minuten Verspätung. Er fährt um ${official(t2)} von Gleis ${g}, nicht um ${official(t1)}.`,
    ]);
    return { text, question: timeQ[0], en: timeQ[1],
      options: three(fmt24(t2), fmt24(t1), [fmt24(t2 + 60), fmt24(t1 + 60)]), answer: fmt24(t2), said: official(t2),
      stmt: x => `Der Zug fährt heute um ${x} Uhr.` };
  },
  function platform() {
    const [g1, g2] = two([...Array(20)].map((_, i) => i + 1)), tr = one(TRAINS), c = one(CITIES);
    const text = one([
      `Information zum ${tr} nach ${c}: Der Zug fährt heute nicht von Gleis ${g1}, sondern von Gleis ${g2}. Wir bitten um Entschuldigung.`,
      `Achtung, bitte! Der ${tr} nach ${c} fährt heute von Gleis ${g2}. Auf Gleis ${g1} fährt heute kein Zug.`,
      `Liebe Fahrgäste nach ${c}: Bitte gehen Sie zu Gleis ${g2}. Ihr ${tr} fährt heute dort um ${official(pickTime(7, 20, 5))}, nicht auf Gleis ${g1}.`,
    ]);
    return { text, question: 'Von welchem Gleis fährt der Zug?', en: 'Which platform does the train leave from?',
      options: three(`Gleis ${g2}`, `Gleis ${g1}`, [`Gleis ${g2 + 1}`, `Gleis ${g1 + 2}`]), answer: `Gleis ${g2}`, said: `Gleis ${g2}`,
      stmt: x => `Der Zug fährt von ${x}.` };
  },
  function doctor() {
    const [d1, d2, d3] = three_(DAYS), t1 = pickTime(8, 11, 15), t2 = otherTime(t1, 8, 11, 15);
    const praxis = one(['die Praxis Doktor Meyer', 'die Zahnarztpraxis Doktor Braun', 'die Praxis Doktor Yilmaz']);
    const text = one([
      `Guten Tag, ${MR()}, hier ist ${praxis}. Ihr Termin am ${d1} um ${everyday(t1)} geht leider nicht. Können Sie am ${d2} um ${everyday(t2)} kommen? Bitte rufen Sie uns an. Danke!`,
      `Hallo ${MR()}, hier ist ${praxis}. Sie haben am ${d1} um ${everyday(t1)} einen Termin. Leider ist der Doktor an diesem Tag nicht da. Ihr neuer Termin ist am ${d2} um ${everyday(t2)}. Auf Wiederhören!`,
    ]);
    if (rand() < 0.5) { // ask day + time
      const a = `${d2}, ${fmt24(t2)}`;
      return { text, question: 'Wann ist der neue Termin?', en: 'When is the new appointment?',
        options: three(a, `${d1}, ${fmt24(t1)}`, [`${d2}, ${fmt24(t1)}`, `${d1}, ${fmt24(t2)}`]), answer: a, said: `am ${d2} um ${everyday(t2)}`,
        stmt: x => `Der neue Termin ist am ${x.replace(', ', ' um ')} Uhr.` };
    }
    return { text, question: 'An welchem Tag ist der neue Termin?', en: 'On which day is the new appointment?',
      options: three(d2, d1, [d3]), answer: d2, said: `am ${d2}`, stmt: x => `Der neue Termin ist am ${x}.` };
  },
  function meetingTime() {
    const t1 = pickTime(17, 20, 15), t2 = t1 + one([15, 30, 60]), [f, c] = two(FRIENDS), place = one(PLACES);
    const text = one([
      `Hallo ${f}, hier ist ${c}. Ich kann heute leider nicht um ${everyday(t1)} kommen. Treffen wir uns um ${everyday(t2)} ${place}? Bis später!`,
      `Hi ${f}, ich bin's, ${c}. Ich komme heute etwas später. Wir treffen uns nicht um ${everyday(t1)}, sondern um ${everyday(t2)}, ${place}. Bis dann!`,
    ]);
    return { text, question: 'Wann treffen sie sich?', en: 'When are they meeting?',
      options: three(fmt24(t2), fmt24(t1), [fmt24(t2 + 30), fmt24(t1 - 30)]), answer: fmt24(t2), said: `um ${everyday(t2)}`,
      stmt: x => `Sie treffen sich um ${x} Uhr.` };
  },
  function meetingPlace() {
    const [p1, p2, p3] = three_(PLACES), [f, c] = two(FRIENDS), t = pickTime(17, 20, 30);
    const text = one([
      `Hallo ${f}, hier ist ${c}. Wir treffen uns heute um ${everyday(t)} nicht ${p1}, sondern ${p2}. Bis später!`,
      `Hi ${f}! Ich warte heute um ${everyday(t)} nicht ${p1}, sondern ${p2}. Liebe Grüße, ${c}.`,
    ]);
    return { text, question: 'Wo treffen sie sich?', en: 'Where are they meeting?',
      options: three(p2, p1, [p3]), answer: p2, said: p2, stmt: x => `Sie treffen sich ${x}.` };
  },
  function shopHours() {
    const [own, the] = one([['unsere Apotheke', 'die Apotheke'], ['unser Supermarkt', 'der Supermarkt'], ['unsere Bäckerei', 'die Bäckerei'],
      ['unsere Bibliothek', 'die Bibliothek'], ['unser Geschäft', 'das Geschäft']]);
    const normal = one([19, 20]), today = one([14, 15, 16, 17]), open = one([7, 8, 9, 10]);
    if (rand() < 0.7) { // closing time today
      const text = one([
        `Liebe Kundinnen und Kunden, ${own} schließt heute schon um ${today} Uhr. Sonst sind wir bis ${normal} Uhr für Sie da. Morgen öffnen wir wieder um ${open} Uhr.`,
        `Achtung, eine Information: Heute ist ${own} nur bis ${today} Uhr geöffnet, nicht bis ${normal} Uhr. Vielen Dank!`,
      ]);
      return { text, question: `Wann schließt ${the} heute?`, en: 'When does it close today?',
        options: three(`${today}:00`, `${normal}:00`, [`${open}:00`, `${today + 1}:00`]), answer: `${today}:00`, said: `${today} Uhr`,
        stmt: x => `${cap(the)} schließt heute um ${x} Uhr.` };
    }
    const text = `Liebe Kundinnen und Kunden, ${own} schließt heute um ${today} Uhr. Morgen öffnen wir wieder um ${open} Uhr. Wir freuen uns auf Sie!`;
    return { text, question: `Wann öffnet ${the} morgen?`, en: 'When does it open tomorrow?',
      options: three(`${open}:00`, `${today}:00`, [`${open + 1}:00`, `${open + 2}:00`]), answer: `${open}:00`, said: `um ${open} Uhr`,
      stmt: x => `${cap(the)} öffnet morgen um ${x} Uhr.` };
  },
  function offer() {
    // [item, verb]: "ein Kilo …" is singular (kostet), "sechs Brötchen" plural (kosten)
    const items = [['ein Kilo Äpfel', 'kostet'], ['ein Kilo Tomaten', 'kostet'], ['sechs Brötchen', 'kosten'],
      ['ein Liter Milch', 'kostet'], ['ein Stück Käse', 'kostet'], ['eine Flasche Wasser', 'kostet'], ['ein Kilo Bananen', 'kostet']];
    const [A, B] = two(items), cents = () => 100 * rnd(3) + one([19, 29, 49, 79, 99]);
    const pA = cents(); let pB; do pB = cents(); while (pB === pA);
    const old = pA + 100 * (1 + rnd(2));
    const [text, trap] = one([
      [`Heute im Angebot: ${A[0]} für nur ${sayEuro(pA)}. Und ${B[0]} ${B[1]} heute nur ${sayEuro(pB)}.`, pB],
      [`Liebe Kunden, unser Angebot heute: ${A[0]} nur ${sayEuro(pA)}! ${cap(B[0])} ${B[1]} heute ${sayEuro(pB)}.`, pB],
      [`Bei uns ist heute alles billiger: ${A[0]} ${A[1]} nur ${sayEuro(pA)}, nicht ${sayEuro(old)}.`, old],
    ]);
    return { text, question: `Wie viel ${A[1]} ${A[0]}?`, en: 'How much does it cost?',
      options: three(euro(pA), euro(trap), [euro(pA + 100), euro(pA + 50)]), answer: euro(pA), said: sayEuro(pA),
      stmt: x => `${cap(A[0])} ${A[1]} ${x}.` };
  },
  function flight() {
    const dest = one(['Lissabon', 'Rom', 'Madrid', 'Wien', 'São Paulo', 'Paris']);
    if (rand() < 0.6) { // gate
      const [l1, l2] = two(['A', 'B', 'C', 'D']), n1 = 1 + rnd(30), n2 = 1 + rnd(30);
      const g1 = `Gate ${l1}${n1}`, g2 = `Gate ${l2}${n2}`;
      const text = one([
        `Eine Information für alle Passagiere nach ${dest}: Ihr Flug startet heute nicht von ${g1}, sondern von ${g2}.`,
        `Achtung, bitte! Der Flug nach ${dest} startet heute von ${g2}. ${g1} ist heute geschlossen.`,
      ]);
      return { text, question: 'Von welchem Gate startet der Flug?', en: 'Which gate does the flight leave from?',
        options: three(g2, g1, [`Gate ${l2}${n1}`, `Gate ${l1}${n2}`, `Gate ${l2}${n2 + 1}`]), answer: g2, said: g2,
        stmt: x => `Der Flug startet von ${x}.` };
    }
    const t1 = pickTime(8, 20, 5), t2 = t1 + one([30, 45, 60, 90]);
    return { text: `Information zum Flug nach ${dest}: Der Flug startet heute nicht um ${official(t1)}, sondern erst um ${official(t2)}. Wir bitten um Entschuldigung.`,
      question: 'Wann startet der Flug?', en: 'When does the flight leave?',
      options: three(fmt24(t2), fmt24(t1), [fmt24(t2 + 30), fmt24(t1 - 30)]), answer: fmt24(t2), said: official(t2),
      stmt: x => `Der Flug startet um ${x} Uhr.` };
  },
  function course() {
    const [d1, d2, d3] = three_(WEEKDAYS), r = () => 100 + rnd(300), focus = rnd(3);
    if (focus === 0) {
      const t = pickTime(17, 19, 15);
      return { text: `Hallo, hier ist die Volkshochschule. Ihr Deutschkurs beginnt nächste Woche nicht am ${d1}, sondern am ${d2}, um ${everyday(t)} in Raum ${r()}.`,
        question: 'Wann beginnt der Kurs?', en: 'When does the course start?',
        options: three(d2, d1, [d3]), answer: d2, said: `am ${d2}`, stmt: x => `Der Kurs beginnt am ${x}.` };
    }
    if (focus === 1) {
      const r1 = r(); let r2; do r2 = r(); while (r2 === r1);
      return { text: `Hallo, hier ist die Volkshochschule. Ihr Deutschkurs am ${d1} ist heute nicht in Raum ${r1}, sondern in Raum ${r2}. Bis später!`,
        question: 'In welchem Raum ist der Kurs?', en: 'Which room is the course in?',
        options: three(`Raum ${r2}`, `Raum ${r1}`, [`Raum ${r2 + 1}`, `Raum ${r1 + 10}`]), answer: `Raum ${r2}`, said: `Raum ${r2}`,
        stmt: x => `Der Kurs ist in ${x}.` };
    }
    const t1 = pickTime(17, 19, 30), t2 = t1 - one([15, 30]);
    return { text: `Hallo, hier ist die Volkshochschule. Ihr Deutschkurs am ${d1} beginnt nicht um ${everyday(t1)}, sondern schon um ${everyday(t2)}.`,
      question: `Wann beginnt der Kurs am ${d1}?`, en: 'When does the course start?',
      options: three(fmt24(t2), fmt24(t1), [fmt24(t2 - 60), fmt24(t1 + 30)]), answer: fmt24(t2), said: `um ${everyday(t2)}`,
      stmt: x => `Der Kurs beginnt um ${x} Uhr.` };
  },
  function cinema() {
    const film = one(['Sommer in Berlin', 'Das blaue Haus', 'Mein Freund Max', 'Die lange Reise']);
    if (rand() < 0.5) { // start time
      const t1 = pickTime(19, 21, 15), t2 = t1 - one([15, 30, 60]);
      return { text: `Kino am Markt, guten Tag. Achtung: Heute beginnt der Film „${film}“ schon um ${official(t2)}, nicht um ${official(t1)}. Die Karten kosten ${sayEuro(100 * (8 + rnd(4)))}.`,
        question: 'Wann beginnt der Film heute?', en: 'When does the film start today?',
        options: three(fmt24(t2), fmt24(t1), [fmt24(t2 - 60), fmt24(t1 + 30)]), answer: fmt24(t2), said: official(t2),
        stmt: x => `Der Film beginnt heute um ${x} Uhr.` };
    }
    const p = 100 * (8 + rnd(4)) + one([0, 50]), ps = p - 100 * (2 + rnd(2)), student = rand() < 0.5;
    const [a, trap] = student ? [ps, p] : [p, ps];
    return { text: `Kino am Markt, guten Tag. Heute zeigen wir „${film}“ um ${official(pickTime(19, 21, 15))}. Die Karten kosten ${sayEuro(p)}, für Schüler und Studenten nur ${sayEuro(ps)}.`,
      question: student ? 'Wie viel kostet eine Karte für Studenten?' : 'Wie viel kostet eine normale Karte?',
      en: student ? 'How much is a student ticket?' : 'How much is a normal ticket?',
      options: three(euro(a), euro(trap), [euro(a + 100), euro(a + 50)]), answer: euro(a), said: sayEuro(a),
      stmt: x => `Eine ${student ? 'Karte für Studenten' : 'normale Karte'} kostet ${x}.` };
  },
  function phone() {
    const digits = () => String(100000 + rnd(900000));
    const n1 = digits(); let n2; do n2 = digits(); while (n2 === n1);
    const spell = n => n.split('').join(' '); // read digit by digit
    const swap = n => n.slice(0, 4) + n[5] + n[4];
    const text = one([
      `Hallo, hier ist ${one(FRIENDS)}. Bitte ruf mich zurück. Meine neue Nummer ist null eins sieben sechs, ${spell(n2)}. Die alte Nummer ist nicht mehr gültig: null eins sieben sechs, ${spell(n1)}.`,
      `Guten Tag, hier ist ${MR()}. Bitte rufen Sie mich zurück, aber nicht unter null eins sieben sechs, ${spell(n1)}. Meine neue Nummer ist null eins sieben sechs, ${spell(n2)}. Vielen Dank!`,
    ]);
    return { text, question: 'Wie ist die neue Nummer?', en: 'What is the new number?',
      options: three(`0176 ${n2}`, `0176 ${n1}`, [`0176 ${swap(n2)}`, `0176 ${n2.slice(0, 5)}${(+n2[5] + 1) % 10}`]), answer: `0176 ${n2}`, said: spell(n2),
      stmt: x => `Die neue Nummer ist ${x}.` };
  },
  function party() {
    const WEEKEND = ['Freitag', 'Samstag', 'Sonntag'], [f, c] = two(FRIENDS);
    if (rand() < 0.5) { // which day
      const [d1, d2, d3] = three_(WEEKEND);
      const text = one([
        `Hi ${f}, hier ist ${c}. Unsere Party ist nicht am ${d1}, sondern am ${d2}. Sie beginnt um ${everyday(pickTime(19, 20, 30))}. Bring bitte etwas zu trinken mit!`,
        `Hallo ${f}! Ich mache am ${d2} eine Party, nicht am ${d1}. Kommst du? Liebe Grüße, ${c}.`,
      ]);
      return { text, question: 'Wann ist die Party?', en: 'When is the party?',
        options: three(d2, d1, [d3]), answer: d2, said: `am ${d2}`, stmt: x => `Die Party ist am ${x}.` };
    }
    // what to bring: [option label, accusative phrase]
    const [bring, have, other] = three_([['Salat', 'einen Salat'], ['Kuchen', 'einen Kuchen'], ['Getränke', 'Getränke'], ['Brot', 'Brot'], ['Obst', 'Obst']]);
    return { text: `Hi ${f}, hier ist ${c}. Für die Party am ${one(WEEKEND)} haben wir schon ${have[1]}. Kannst du bitte ${bring[1]} mitbringen? Danke!`,
      question: `Was soll ${f} mitbringen?`, en: `What should ${f} bring?`,
      options: three(bring[0], have[0], [other[0]]), answer: bring[0], said: bring[1],
      stmt: x => `${f} soll ${[bring, have, other].find(i => i[0] === x)[1]} mitbringen.` };
  },
  function bus() {
    const [l1, l2] = two([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 16, 18]), every = one([10, 15, 20]);
    const text = one([
      `Liebe Fahrgäste, die Straßenbahn Linie ${l1} fährt heute nicht. Bitte nehmen Sie den Bus ${l2}. Der Bus fährt alle ${every} Minuten.`,
      `Achtung: Die Linie ${l1} fährt heute nur bis zum Bahnhof. Bitte fahren Sie dann mit dem Bus ${l2} weiter. Er fährt alle ${every} Minuten.`,
    ]);
    return { text, question: 'Welchen Bus sollen die Fahrgäste nehmen?', en: 'Which bus should passengers take?',
      options: three(`Bus ${l2}`, `Bus ${l1}`, [`Bus ${every}`, `Bus ${l2 + 10}`]), answer: `Bus ${l2}`, said: `Bus ${l2}`,
      stmt: x => `Die Fahrgäste nehmen den ${x}.` };
  },
  function store() {
    const [f1, f2, f3] = three_([1, 2, 3, 4]), [item, other] = two(['Jacken', 'Schuhe', 'Kinderkleidung', 'Computer', 'Handys', 'Bücher']);
    const text = one([
      `Liebe Kundinnen und Kunden, heute im Angebot: ${item} im ${ORD[f2]} Stock. Im ${ORD[f1]} Stock finden Sie ${other}.`,
      `Sie suchen ${item}? Die finden Sie heute nicht im ${ORD[f1]} Stock, sondern im ${ORD[f2]} Stock. Vielen Dank für Ihren Einkauf!`,
    ]);
    return { text, question: `In welchem Stock gibt es ${item}?`, en: `Which floor has ${item}?`,
      options: three(`${f2}. Stock`, `${f1}. Stock`, [`${f3}. Stock`]), answer: `${f2}. Stock`, said: `im ${ORD[f2]} Stock`,
      stmt: x => `${item} gibt es im ${x}.` };
  },
  function openingHours() {
    const [place, the] = one([['Das Museum', 'das Museum'], ['Das Schwimmbad', 'das Schwimmbad'], ['Die Bibliothek', 'die Bibliothek']]);
    const [closed, d2, d3] = three_(['Montag', 'Dienstag', 'Sonntag']), o = one([9, 10]), c = one([17, 18, 20]);
    const text = `${place} ist jeden Tag von ${o} bis ${c} Uhr geöffnet. Nur am ${closed} ist ${the} geschlossen.`;
    if (rand() < 0.5) return { text, question: `An welchem Tag ist ${the} geschlossen?`, en: 'Which day is it closed?',
      options: three(closed, d2, [d3]), answer: closed, said: `am ${closed}`, stmt: x => `Am ${x} ist ${the} geschlossen.` };
    return { text, question: `Bis wann ist ${the} geöffnet?`, en: 'Until when is it open?',
      options: three(`${c}:00`, `${o}:00`, [`${c + 1}:00`, `${c - 1}:00`]), answer: `${c}:00`, said: `bis ${c} Uhr`,
      stmt: x => `${cap(the)} ist bis ${x} Uhr geöffnet.` };
  },
  function restaurant() {
    // "erst um" = later than planned, so t2 > t1
    const n = 2 + rnd(5), d = one(['Freitag', 'Samstag']), t1 = pickTime(18, 19, 30), t2 = t1 + one([30, 60, 90]);
    const text = `Guten Tag, hier ist das Restaurant ${one(['Roma', 'Zur Post', 'Lisboa'])}. Ihr Tisch für ${n} Personen am ${d} ist leider erst um ${everyday(t2)} frei, nicht um ${everyday(t1)}. Ist das okay? Bitte rufen Sie uns an.`;
    if (rand() < 0.6) return { text, question: 'Wann ist der Tisch frei?', en: 'When is the table free?',
      options: three(fmt24(t2), fmt24(t1), [fmt24(t2 + 60), fmt24(t1 - 60), fmt24(t2 + 30), fmt24(t2 + 90)]), answer: fmt24(t2), said: `um ${everyday(t2)}`,
      stmt: x => `Der Tisch ist um ${x} Uhr frei.` };
    return { text, question: 'Für wie viele Personen ist der Tisch?', en: 'How many people is the table for?',
      options: three(`${n} Personen`, `${n + 1} Personen`, [`${n + 2} Personen`]), answer: `${n} Personen`, said: `${n} Personen`,
      stmt: x => `Der Tisch ist für ${x}.` };
  },
  function weather() {
    const a = 5 + rnd(10), b = a + 3 + rnd(8), rainFirst = rand() < 0.5;
    const text = rainFirst
      ? `Und jetzt das Wetter für morgen: Am Vormittag regnet es, am Nachmittag scheint die Sonne. Am Morgen sind es ${a} Grad, am Nachmittag ${b} Grad.`
      : `Das Wetter für morgen: Am Vormittag scheint die Sonne, am Nachmittag regnet es. Am Morgen sind es ${a} Grad, am Nachmittag ${b} Grad.`;
    if (rand() < 0.5) return { text, question: 'Wie warm ist es morgen am Nachmittag?', en: 'How warm is it tomorrow afternoon?',
      options: three(`${b} Grad`, `${a} Grad`, [`${b + 5} Grad`, `${b - 1} Grad`]), answer: `${b} Grad`, said: `${b} Grad`,
      stmt: x => `Am Nachmittag sind es ${x}.` };
    const sun = 'Die Sonne scheint.', rain = 'Es regnet.', ans = rainFirst ? sun : rain;
    const AFTERNOON = { [sun]: 'Am Nachmittag scheint die Sonne.', [rain]: 'Am Nachmittag regnet es.', 'Es schneit.': 'Am Nachmittag schneit es.' };
    return { text, question: 'Wie ist das Wetter morgen am Nachmittag?', en: 'What is the weather like tomorrow afternoon?',
      options: three(ans, ans === sun ? rain : sun, ['Es schneit.']), answer: ans, said: rainFirst ? 'am Nachmittag scheint die Sonne' : 'am Nachmittag regnet es',
      stmt: x => AFTERNOON[x] };
  },
];

// Seeded PRNG (mulberry32): same seed -> same numbers on every device and in tools/make-audio.mjs.
const mulberry32 = a => () => {
  a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// A fixed pool of tasks, so every text can have a pre-generated audio clip.
// Changing any template changes the pool: re-run `npm run audio`.
export function makePool(n = 400, seed = 1) {
  const saved = rand;
  rand = mulberry32(seed);
  try { return Array.from({ length: n }, () => one(TEMPLATES)()); } finally { rand = saved; }
}
export const POOL = makePool();
