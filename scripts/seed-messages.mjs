/**
 * Seed script: populates the Firestore emulator with approved large guest messages
 * for testing the messages carousel on mobile.
 * Run with: node scripts/seed-messages.mjs
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, addDoc, Timestamp } from 'firebase/firestore';

const app = initializeApp({ projectId: 'demo-wedding-site' });
const db = getFirestore(app);
connectFirestoreEmulator(db, 'localhost', 8080);

const messages = [
  {
    guestName: 'Ana & Ricardo',
    message: 'Que dia lindo esse vai ser! Lorena e Marcelo, vocês são um casal incrível que se complementa de uma forma tão bonita. Desde que os conhecemos, sempre admiramos a cumplicidade, o carinho e o respeito que vocês têm um pelo outro. Que essa união seja repleta de amor, aventuras e muita alegria. Desejamos uma vida a dois cheia de momentos inesquecíveis, viagens incríveis, gargalhadas honestas e um amor que só cresce a cada dia que passa. Parabéns pelo grande passo! Que venham muitos anos felizes juntos. Com todo carinho do mundo!',
    timestamp: Timestamp.fromDate(new Date('2026-06-01T10:00:00Z')),
  },
  {
    guestName: 'Família Oliveira',
    message: 'Lorena e Marcelo, é com o coração transbordando de alegria que celebramos este dia tão especial com vocês. Acompanhar essa história de amor de perto foi um privilégio enorme. Vemos como se olham, como se cuidam, como torcem um pelo outro mesmo nas situações mais difíceis. Isso é raro e precioso. Que o casamento de vocês seja um lar de paz, de cumplicidade e de muita parceria. Que cada desafio seja superado de mãos dadas, e que cada conquista seja celebrada juntos. Sejam sempre o porto seguro um do outro. Parabéns, amados!',
    timestamp: Timestamp.fromDate(new Date('2026-06-02T11:00:00Z')),
  },
  {
    guestName: 'Beatriz Mendes',
    message: 'Minha querida Lorena! Já faz tantos anos que somos amigas e eu nunca imaginei que um dia estaria aqui, escrevendo uma mensagem no seu casamento com o Marcelo. Que jornada linda foi ver esse amor crescer! Você merece toda a felicidade do mundo, e eu tenho certeza absoluta de que encontrou a pessoa certa. Marcelo, cuide bem dela, trate-a como a rainha que ela é! E Lorena, seja feliz, ria muito, viaje muito, e aproveite cada segundo ao lado dele. Amo vocês dois de verdade. Que venham filhos lindos e muitas festas para celebrar!',
    timestamp: Timestamp.fromDate(new Date('2026-06-03T09:30:00Z')),
  },
  {
    guestName: 'Carlos & Fernanda',
    message: 'Que emoção estar aqui celebrando esse momento com vocês! Lorena e Marcelo, vocês são a prova de que o amor verdadeiro existe e é bonito de se ver. Cada vez que estamos juntos, sentimos a energia positiva que vem de vocês dois. É impossível não sorrir ao ver como se tratam com tanto carinho e respeito. Que esse casamento seja apenas o começo de uma aventura incrível juntos. Que as próximas décadas sejam repletas de saúde, prosperidade, e muito amor. Estamos aqui para torcer por vocês sempre. Com muito amor e carinho, Carlos e Fernanda!',
    timestamp: Timestamp.fromDate(new Date('2026-06-04T14:00:00Z')),
  },
  {
    guestName: 'Pedro Alves',
    message: 'Marcelo, meu amigo de tantos anos! Ver você aqui hoje, prestes a casar com a Lorena, me enche de um orgulho enorme. Você cresceu tanto como pessoa ao longo dessa relação, e ela claramente trouxe o melhor de você à tona. Lorena, bem-vinda de vez à família! Você já faz parte do nosso grupo há muito tempo, mas agora é oficial. Cuidem um do outro, respeitem as diferenças, e nunca deixem a rotina apagar a chama que está tão evidente hoje. Brindo com vocês por muitos e muitos anos de felicidade juntos. Saúde!',
    timestamp: Timestamp.fromDate(new Date('2026-06-05T16:00:00Z')),
  },
  {
    guestName: 'Mariana Costa',
    message: 'Lorena! Que saudade de você e que alegria imensa estar aqui hoje. Você é uma das pessoas mais especiais que já passei pela vida, e o Marcelo é um sortudo por ter você ao lado. Essa mensagem é pequena perto de tudo que sinto, mas saiba que torço muito pela felicidade de vocês. Que esse casamento seja o começo de uma vida linda, cheia de amor, cumplicidade, e momentos que façam o coração apertar de tanta gratidão. Amo você de verdade. Parabéns ao casal mais lindo!',
    timestamp: Timestamp.fromDate(new Date('2026-06-06T08:00:00Z')),
  },
  {
    guestName: 'Tiago & Sofia',
    message: 'Que casal lindo! Lorena e Marcelo, vocês irradiam felicidade sempre que estão juntos. É impossível não sorrir ao vê-los. Que esse novo capítulo seja cheio de aventuras, risadas, crescimento mútuo e muito amor. Que nunca percam a leveza e o cuidado que têm um pelo outro. Somos eternamente gratos por fazer parte dessa história tão bonita.',
    timestamp: Timestamp.fromDate(new Date('2026-06-07T10:00:00Z')),
  },
  {
    guestName: 'Débora Lima',
    message: 'Lorena, você sempre foi um exemplo de força, alegria e generosidade. Ver você hoje, radiante ao lado do Marcelo, me enche o coração de uma alegria difícil de colocar em palavras. Marcelo, você chegou na vida dela e trouxe uma paz e uma leveza que ela merecia muito. Cuidem um do outro sempre. Felicidades eternas ao casal!',
    timestamp: Timestamp.fromDate(new Date('2026-06-08T14:00:00Z')),
  },
  {
    guestName: 'Família Santos',
    message: 'Parabéns, Lorena e Marcelo! Que Deus abençoe cada passo dessa nova jornada. Que o amor que transborda hoje permaneça vivo em cada detalhe do dia a dia. Que a cumplicidade de vocês seja sempre o alicerce da família que estão construindo. Com muito carinho e admiração.',
    timestamp: Timestamp.fromDate(new Date('2026-06-09T09:00:00Z')),
  },
  {
    guestName: 'Rafael & Camila',
    message: 'Que dia especial! Lorena e Marcelo, vocês são a prova de que quando duas pessoas se encontram com as intenções certas, o amor floresce de uma forma bonita e duradoura. Que essa união traga paz, alegria, cumplicidade e muitos momentos de pura felicidade. Estamos aqui para torcer por vocês hoje e sempre. Muitos beijos do fundo do coração!',
    timestamp: Timestamp.fromDate(new Date('2026-06-10T11:00:00Z')),
  },
];

async function seed() {
  console.log('Seeding publicMessages collection on emulator...\n');
  for (const msg of messages) {
    const ref = await addDoc(collection(db, 'publicMessages'), msg);
    console.log(`✓ Added message from "${msg.guestName}" (id: ${ref.id})`);
  }
  console.log('\nDone! All messages seeded successfully.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
