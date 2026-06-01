/* ============================================================
   MAKEUP CAMILA SOARES — Services Configuration
   Shared between public booking form and admin panel.
   MVP-ready: mirrors a REST /services endpoint response shape.
   ============================================================ */

'use strict';

const CAMILA_WHATSAPP_NUM = '5511999999999';
const CAMILA_PIX_KEY      = '(11) 99999-9999'; // Chave PIX — atualizar com a real
const DEPOSIT_LABEL       = 'Adiantamento (30%)';

/* ----------------------------------------------------------------
   SERVICES_CONFIG
   price        → preço fixo do serviço
   pricePerPerson → preço por pessoa (madrinhas)
   depositPct   → percentual de adiantamento (0.30 = 30%)
   duration     → duração em horas (para Google/Apple Calendar)
   priceNote    → nota de exibição no card público
---------------------------------------------------------------- */
const SERVICES_CONFIG = {
  noiva: {
    label:         'Noiva (Dia Exclusivo)',
    shortLabel:    'Noiva',
    description:   'Dia fechado exclusivo, acompanhamento troca do vestido e retoques',
    icon:          'fa-ring',
    price:         1200,
    depositPct:    0.30,
    duration:      8,
    priceDisplay:  'R$ 1.200',
    priceNote:     'Dia exclusivo'
  },
  madrinhas: {
    label:          'Madrinhas',
    shortLabel:     'Madrinhas',
    description:    'Pacote para grupo de madrinhas — mínimo 2 pessoas',
    icon:           'fa-users',
    pricePerPerson: 180,
    minPeople:      2,
    depositPct:     0.30,
    duration:       null,         // calculado: 1.5h × pessoas
    priceDisplay:   'R$ 180',
    priceNote:      'por pessoa'
  },
  formatura: {
    label:        'Formatura',
    shortLabel:   'Formatura',
    description:  'Make especial para cerimônia de formatura',
    icon:         'fa-graduation-cap',
    price:        350,
    depositPct:   0.30,
    duration:     2,
    priceDisplay: 'R$ 350',
    priceNote:    null
  },
  ensaio: {
    label:        'Ensaio Fotográfico',
    shortLabel:   'Ensaio',
    description:  'Make para ensaio fotográfico profissional',
    icon:         'fa-camera',
    price:        280,
    depositPct:   0.30,
    duration:     3,
    priceDisplay: 'R$ 280',
    priceNote:    null
  },
  evento: {
    label:        'Evento Social',
    shortLabel:   'Evento',
    description:  'Make para festas, casamentos como convidada',
    icon:         'fa-star',
    price:        250,
    depositPct:   0.30,
    duration:     2,
    priceDisplay: 'R$ 250',
    priceNote:    null
  },
  social: {
    label:        'Make Social',
    shortLabel:   'Social',
    description:  'Make para o dia a dia ou ocasiões casuais',
    icon:         'fa-sun',
    price:        180,
    depositPct:   0.30,
    duration:     1.5,
    priceDisplay: 'R$ 180',
    priceNote:    null
  },
  aula: {
    label:        'Aula Particular',
    shortLabel:   'Aula',
    description:  'Aprenda técnicas personalizadas de maquiagem',
    icon:         'fa-chalkboard-teacher',
    price:        300,
    depositPct:   0.50,
    duration:     2,
    priceDisplay: 'R$ 300',
    priceNote:    '50% de entrada'
  }
};

// ---------- HELPERS ----------

function getServiceConfig(type) {
  return SERVICES_CONFIG[type] || null;
}

function calcServiceTotal(type, numPeople) {
  const svc = getServiceConfig(type);
  if (!svc) return 0;
  if (type === 'madrinhas') {
    return (svc.pricePerPerson || 0) * Math.max(svc.minPeople || 1, parseInt(numPeople) || 1);
  }
  return svc.price || 0;
}

function calcDeposit(type, numPeople) {
  const svc = getServiceConfig(type);
  if (!svc) return 0;
  return Math.ceil(calcServiceTotal(type, numPeople) * (svc.depositPct || 0.30));
}

function calcRemaining(type, numPeople) {
  return calcServiceTotal(type, numPeople) - calcDeposit(type, numPeople);
}

function calcDuration(type, numPeople) {
  const svc = getServiceConfig(type);
  if (!svc) return 2;
  if (type === 'madrinhas') return Math.max(2, (parseInt(numPeople) || 1) * 1.5);
  return svc.duration || 2;
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function buildWazeUrl(address) {
  if (!address) return null;
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}
