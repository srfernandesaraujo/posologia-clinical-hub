export interface BioDigitalModel {
  id: string;
  name: string;
  specialty: string;
}

export const biodigitalModels: BioDigitalModel[] = [
  // Cardiologia
  { id: "2iYs", name: "Coração — Anatomia Completa", specialty: "cardiologia" },
  { id: "1h5M", name: "Artérias Coronárias", specialty: "cardiologia" },
  { id: "3Bkj", name: "Sistema Cardiovascular", specialty: "cardiologia" },
  { id: "2FFb", name: "Válvulas Cardíacas", specialty: "cardiologia" },

  // Ortopedia
  { id: "18RI", name: "Articulação do Joelho", specialty: "ortopedia" },
  { id: "2426", name: "Articulação do Quadril", specialty: "ortopedia" },
  { id: "1kXp", name: "Coluna Vertebral", specialty: "ortopedia" },
  { id: "18Ri", name: "Esqueleto Completo", specialty: "ortopedia" },

  // Odontologia
  { id: "22rH", name: "Mandíbula e Dentes", specialty: "odontologia" },
  { id: "1JBe", name: "Crânio — Vista Lateral", specialty: "odontologia" },
  { id: "3r7s", name: "Anatomia Dental", specialty: "odontologia" },

  // Dermatologia / Cirurgia Plástica
  { id: "1gQn", name: "Músculos Faciais", specialty: "dermatologia" },
  { id: "2J4L", name: "Cabeça — Anatomia", specialty: "dermatologia" },
  { id: "1h2Q", name: "Pele — Camadas", specialty: "dermatologia" },

  // Farmacologia / Dispositivos
  { id: "15LZ", name: "Sistema Reprodutor Feminino", specialty: "farmacologia" },
  { id: "2rEr", name: "Pelve Feminina", specialty: "farmacologia" },
  { id: "1Jm3", name: "Útero e Anexos", specialty: "farmacologia" },

  // Cirurgia Geral
  { id: "24DG", name: "Abdômen — Órgãos", specialty: "cirurgia" },
  { id: "1Bkj", name: "Fígado e Vesícula Biliar", specialty: "cirurgia" },
  { id: "2sLa", name: "Trato Gastrointestinal", specialty: "cirurgia" },
];

export function getBioDigitalModelsBySpecialty(specialty: string): BioDigitalModel[] {
  return biodigitalModels.filter((m) => m.specialty === specialty);
}
