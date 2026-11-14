// Listening comprehension in the style of Start Deutsch 1, Hören: short announcements and phone messages.
// Self-written templates (the real exam texts are copyrighted). Each call returns a fresh random task:
// { text, question, en, options, answer, said, stmt } where `said` is how the answer is spoken in `text`
// and stmt(option) turns an option into a Richtig/Falsch statement.
import { clockPhrase } from '../answer.js';

const rnd = n => Math.random() * n | 0;
const one = a => a[rnd(a.length)];
const two = a => { const x = one(a); let y; do y = one(a); while (y === x); return [x, y]; };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Times are minutes since midnight.
const T = (h, m = 0) => h * 60 + m;
const pickTime = (fromH, toH, step) => T(fromH + rnd(toH - fromH + 1), step * rnd(60 / step));
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
const CITIES = ['München', 'Hamburg', 'Berlin', 'Frankfurt', 'Köln', 'Stuttgart', 'Dresden'];
const FRIENDS = ['Ana', 'Julia', 'Tom', 'Paula', 'Lukas', 'Sara'];
const SURNAMES = ['Silva', 'Becker', 'Schmidt', 'Costa', 'Weber', 'Klein'];

export const TEMPLATES = [
  function trainDelay() {
    const t1 = pickTime(6, 21, 5), d = one([10, 15, 20, 30]), t2 = t1 + d;
    return { text: `Achtung an Gleis ${1 + rnd(12)}: Der ICE nach ${one(CITIES)}, Abfahrt ${official(t1)}, hat heute ${d} Minuten Verspätung. Neue Abfahrt: ${official(t2)}.`,
      question: 'Wann fährt der Zug heute?', en: 'When does the train leave today?',
      options: three(fmt24(t2), fmt24(t1), [fmt24(t2 + 60), fmt24(t1 + 60)]), answer: fmt24(t2), said: official(t2),
      stmt: x => `Der Zug fährt heute um ${x} Uhr.` };
  },
  function platform() {
    const [g1, g2] = two([...Array(20)].map((_, i) => i + 1));
    return { text: `Information zum ICE nach ${one(CITIES)}: Der Zug fährt heute nicht von Gleis ${g1}, sondern von Gleis ${g2}. Wir bitten um Entschuldigung.`,
      question: 'Von welchem Gleis fährt der Zug?', en: 'Which platform does the train leave from?',
      options: three(`Gleis ${g2}`, `Gleis ${g1}`, [`Gleis ${g2 + 1}`, `Gleis ${g1 + 2}`]), answer: `Gleis ${g2}`, said: `Gleis ${g2}`,
      stmt: x => `Der Zug fährt von ${x}.` };
  },
  function doctor() {
    const [d1, d2] = two(DAYS);
    let t1 = pickTime(8, 11, 15), t2; do t2 = pickTime(8, 11, 15); while (t2 === t1);
    const a = `${d2}, ${fmt24(t2)}`;
    return { text: `Guten Tag, Frau ${one(SURNAMES)}, hier ist die Praxis Doktor Meyer. Ihr Termin am ${d1} um ${everyday(t1)} geht leider nicht. Können Sie am ${d2} um ${everyday(t2)} kommen? Bitte rufen Sie uns an. Danke!`,
      question: 'Wann ist der neue Termin?', en: 'When is the new appointment?',
      options: three(a, `${d1}, ${fmt24(t1)}`, [`${d2}, ${fmt24(t1)}`, `${d1}, ${fmt24(t2)}`]), answer: a, said: `am ${d2} um ${everyday(t2)}`,
      stmt: x => `Der neue Termin ist am ${x.replace(', ', ' um ')} Uhr.` };
  },
  function meeting() {
    const t1 = pickTime(18, 20, 15), t2 = t1 + one([15, 30, 60]);
    return { text: `Hallo ${one(FRIENDS)}, hier ist ${one(FRIENDS)}. Ich kann heute leider nicht um ${everyday(t1)} kommen. Treffen wir uns um ${everyday(t2)} vor dem Kino? Bis später!`,
      question: 'Wann treffen sie sich?', en: 'When are they meeting?',
      options: three(fmt24(t2), fmt24(t1), [fmt24(t2 + 30), fmt24(t1 - 30)]), answer: fmt24(t2), said: `um ${everyday(t2)}`,
      stmt: x => `Sie treffen sich um ${x} Uhr.` };
  },
  function shopClosing() {
    const normal = one([19, 20]), today = one([14, 16, 17, 18]);
    return { text: `Liebe Kundinnen und Kunden, heute schließen wir schon um ${today} Uhr. Sonst ist unser Geschäft bis ${normal} Uhr geöffnet. Morgen sind wir ab 9 Uhr wieder für Sie da.`,
      question: 'Wann schließt das Geschäft heute?', en: 'When does the shop close today?',
      options: three(`${today}:00`, `${normal}:00`, ['9:00', `${today + 1}:00`]), answer: `${today}:00`, said: `um ${today} Uhr`,
      stmt: x => `Das Geschäft schließt heute um ${x} Uhr.` };
  },
  function offer() {
    // [item, verb]: "ein Kilo …" is singular (kostet), "sechs Brötchen" plural (kosten)
    const items = [['ein Kilo Äpfel', 'kostet'], ['ein Kilo Tomaten', 'kostet'], ['sechs Brötchen', 'kosten'],
      ['ein Liter Milch', 'kostet'], ['ein Stück Käse', 'kostet'], ['eine Flasche Wasser', 'kostet']];
    const [A, B] = two(items), cents = () => 100 * rnd(3) + one([19, 29, 49, 79, 99]);
    const pA = cents(); let pB; do pB = cents(); while (pB === pA);
    const cap = s => s[0].toUpperCase() + s.slice(1);
    return { text: `Heute im Angebot: ${A[0]} für nur ${sayEuro(pA)}. Und ${B[0]} ${B[1]} heute nur ${sayEuro(pB)}.`,
      question: `Wie viel ${A[1]} ${A[0]}?`, en: 'How much does it cost?',
      options: three(euro(pA), euro(pB), [euro(pA + 100), euro(pA + 50)]), answer: euro(pA), said: sayEuro(pA),
      stmt: x => `${cap(A[0])} ${A[1]} ${x}.` };
  },
  function gate() {
    const [l1, l2] = two(['A', 'B', 'C', 'D']), n1 = 1 + rnd(30), n2 = 1 + rnd(30);
    const g1 = `Gate ${l1}${n1}`, g2 = `Gate ${l2}${n2}`;
    return { text: `Eine Information für alle Passagiere nach ${one(['Lissabon', 'Rom', 'Madrid', 'Wien', 'São Paulo'])}: Ihr Flug startet heute nicht von ${g1}, sondern von ${g2}.`,
      question: 'Von welchem Gate startet der Flug?', en: 'Which gate does the flight leave from?',
      options: three(g2, g1, [`Gate ${l2}${n1}`, `Gate ${l1}${n2}`, `Gate ${l2}${n2 + 1}`]), answer: g2, said: g2,
      stmt: x => `Der Flug startet von ${x}.` };
  },
  function course() {
    const [d1, d2] = two(DAYS.slice(0, 5)), d3 = DAYS.slice(0, 5).find(d => d !== d1 && d !== d2), t = pickTime(17, 19, 15);
    return { text: `Hallo, hier ist die Volkshochschule. Ihr Deutschkurs beginnt nächste Woche nicht am ${d1}, sondern am ${d2}, um ${everyday(t)} in Raum ${100 + rnd(300)}.`,
      question: 'Wann beginnt der Kurs?', en: 'When does the course start?',
      options: three(d2, d1, [d3]), answer: d2, said: `am ${d2}`,
      stmt: x => `Der Kurs beginnt am ${x}.` };
  },
  function cinema() {
    const t1 = pickTime(19, 21, 15), t2 = t1 - one([15, 30, 60]), p = 100 * (7 + rnd(5)) + one([0, 50]);
    const film = one(['Sommer in Berlin', 'Das blaue Haus', 'Mein Freund Max', 'Die lange Reise']);
    return { text: `Kino am Markt, guten Tag. Achtung: Heute beginnt der Film „${film}“ schon um ${official(t2)}, nicht um ${official(t1)}. Die Karten kosten ${sayEuro(p)}.`,
      question: 'Wann beginnt der Film heute?', en: 'When does the film start today?',
      options: three(fmt24(t2), fmt24(t1), [fmt24(t2 - 60), fmt24(t1 + 30)]), answer: fmt24(t2), said: official(t2),
      stmt: x => `Der Film beginnt heute um ${x} Uhr.` };
  },
  function phone() {
    const digits = () => String(100000 + rnd(900000));
    const n1 = digits(); let n2; do n2 = digits(); while (n2 === n1);
    const spell = n => n.split('').join(' '); // read digit by digit
    const swap = n => n.slice(0, 4) + n[5] + n[4];
    return { text: `Hallo, hier ist ${one(FRIENDS)}. Bitte ruf mich zurück. Meine neue Nummer ist null eins sieben sechs, ${spell(n2)}. Die alte Nummer ist nicht mehr gültig: null eins sieben sechs, ${spell(n1)}.`,
      question: 'Wie ist die neue Nummer?', en: 'What is the new number?',
      options: three(`0176 ${n2}`, `0176 ${n1}`, [`0176 ${swap(n2)}`, `0176 ${n2.slice(0, 5)}${(+n2[5] + 1) % 10}`]), answer: `0176 ${n2}`, said: spell(n2),
      stmt: x => `Die neue Nummer ist ${x}.` };
  },
  function party() {
    const [d1, d2] = two(['Freitag', 'Samstag', 'Sonntag']), d3 = ['Freitag', 'Samstag', 'Sonntag'].find(d => d !== d1 && d !== d2);
    return { text: `Hi ${one(FRIENDS)}, hier ist ${one(FRIENDS)}. Unsere Party ist nicht am ${d1}, sondern am ${d2}. Sie beginnt um ${everyday(pickTime(19, 20, 30))}. Bring bitte etwas zu trinken mit!`,
      question: 'Wann ist die Party?', en: 'When is the party?',
      options: three(d2, d1, [d3]), answer: d2, said: `am ${d2}`,
      stmt: x => `Die Party ist am ${x}.` };
  },
  function bus() {
    const [l1, l2] = two([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 16, 18]), every = one([10, 15, 20]);
    return { text: `Liebe Fahrgäste, die Straßenbahn Linie ${l1} fährt heute nicht. Bitte nehmen Sie den Bus Nummer ${l2}. Der Bus fährt alle ${every} Minuten.`,
      question: 'Welchen Bus sollen die Fahrgäste nehmen?', en: 'Which bus should passengers take?',
      options: three(`Bus ${l2}`, `Bus ${l1}`, [`Bus ${every}`, `Bus ${l2 + 10}`]), answer: `Bus ${l2}`, said: `Bus Nummer ${l2}`,
      stmt: x => `Die Fahrgäste nehmen den ${x}.` };
  },
];

export const listeningTask = () => one(TEMPLATES)();
