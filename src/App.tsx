import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { ProtectedRoute, AdminRoute, ProfessorRoute } from "@/components/ProtectedRoute";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { AppLayout } from "@/components/layouts/AppLayout";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Contato from "./pages/Contato";
import Dashboard from "./pages/Dashboard";
import Calculadoras from "./pages/Calculadoras";
import Simuladores from "./pages/Simuladores";
import ToolDetail from "./pages/ToolDetail";
import RiscoCardiovascular from "./pages/RiscoCardiovascular";
import DesmaCorticoide from "./pages/DesmaCorticoide";
import EquivalenciaOpioides from "./pages/EquivalenciaOpioides";
import AjusteDoseRenal from "./pages/AjusteDoseRenal";
import EquivalenciaAntidepressivos from "./pages/EquivalenciaAntidepressivos";
import HomaIR from "./pages/HomaIR";
import Findrisc from "./pages/Findrisc";
import CkdEpi from "./pages/CkdEpi";
import CorrecaoSodio from "./pages/CorrecaoSodio";
import CorrecaoCalcio from "./pages/CorrecaoCalcio";
import WellsScore from "./pages/WellsScore";
import QSofa from "./pages/QSofa";
import VancomicinaAUC from "./pages/VancomicinaAUC";
import InsulinaBasalBolus from "./pages/InsulinaBasalBolus";
import HollidaySegar from "./pages/HollidaySegar";
import MeldScore from "./pages/MeldScore";
import QTcCorrigido from "./pages/QTcCorrigido";
import DosePediatrica from "./pages/DosePediatrica";
import RassSas from "./pages/RassSas";
import NutricaoParenteral from "./pages/NutricaoParenteral";
import InteracoesCYP from "./pages/InteracoesCYP";
import SimuladorPRM from "./pages/simuladores/SimuladorPRM";
import SimuladorAntimicrobianos from "./pages/simuladores/SimuladorAntimicrobianos";
import SimuladorTDM from "./pages/simuladores/SimuladorTDM";
import SimuladorAcompanhamento from "./pages/simuladores/SimuladorAcompanhamento";
import SimuladorInsulina from "./pages/simuladores/SimuladorInsulina";
import SimuladorBombaInfusao from "./pages/simuladores/SimuladorBombaInfusao";
import SimuladorDesmameBenzo from "./pages/simuladores/SimuladorDesmameBenzo";
import SimuladorInteracoes from "./pages/simuladores/SimuladorInteracoes";
import SimuladorSNA from "./pages/simuladores/fisiologia/SimuladorSNA";
import SimuladorEletrofisiologiaCardiaca from "./pages/simuladores/fisiologia/SimuladorEletrofisiologiaCardiaca";
import SimuladorDepuracaoRenal from "./pages/simuladores/fisiologia/SimuladorDepuracaoRenal";
import SimuladorEquilibrioAcidoBase from "./pages/simuladores/fisiologia/SimuladorEquilibrioAcidoBase";
import SimuladorRegulacaoGlicemica from "./pages/simuladores/fisiologia/SimuladorRegulacaoGlicemica";
import SimuladorEixoHPA from "./pages/simuladores/fisiologia/SimuladorEixoHPA";
import SimuladorCineticaEnzimatica from "./pages/simuladores/fisiologia/SimuladorCineticaEnzimatica";
import SimuladorSecrecaoGastrica from "./pages/simuladores/fisiologia/SimuladorSecrecaoGastrica";
import SimuladorCascataCoagulacao from "./pages/simuladores/fisiologia/SimuladorCascataCoagulacao";
import SimuladorADME from "./pages/simuladores/fisiologia/SimuladorADME";
import SimuladorCadeiaTransporteEletrons from "./pages/simuladores/bioquimica/SimuladorCadeiaTransporteEletrons";
import SimuladorDissociacaoHemoglobina from "./pages/simuladores/bioquimica/SimuladorDissociacaoHemoglobina";
import SimuladorGlicoliseGliconeogenese from "./pages/simuladores/bioquimica/SimuladorGlicoliseGliconeogenese";
import SimuladorCineticaAvancada from "./pages/simuladores/bioquimica/SimuladorCineticaAvancada";
import SimuladorCicloUreia from "./pages/simuladores/bioquimica/SimuladorCicloUreia";
import SimuladorCascataAcidoAraquidonico from "./pages/simuladores/bioquimica/SimuladorCascataAcidoAraquidonico";
import SimuladorLipoproteinas from "./pages/simuladores/bioquimica/SimuladorLipoproteinas";
import SimuladorPentosesFosfato from "./pages/simuladores/bioquimica/SimuladorPentosesFosfato";
import SimuladorTitulacaoAminoacidos from "./pages/simuladores/bioquimica/SimuladorTitulacaoAminoacidos";
import SimuladorOperonLac from "./pages/simuladores/bioquimica/SimuladorOperonLac";
import SimuladorDoseResposta from "./pages/simuladores/farmacologia/SimuladorDoseResposta";
import SimuladorTransducaoSinal from "./pages/simuladores/farmacologia/SimuladorTransducaoSinal";
import SimuladorJanelaTerapeutica from "./pages/simuladores/farmacologia/SimuladorJanelaTerapeutica";
import SimuladorViasAdministracao from "./pages/simuladores/farmacologia/SimuladorViasAdministracao";
import SimuladorBloqueioNeuromuscular from "./pages/simuladores/farmacologia/SimuladorBloqueioNeuromuscular";
import SimuladorFarmacoAutonomica from "./pages/simuladores/farmacologia/SimuladorFarmacoAutonomica";
import SimuladorToleranciaDependencia from "./pages/simuladores/farmacologia/SimuladorToleranciaDependencia";
import SimuladorFarmacogenomica from "./pages/simuladores/farmacologia/SimuladorFarmacogenomica";
import SimuladorEstabilidade from "./pages/simuladores/farmacotecnica/SimuladorEstabilidade";
import SimuladorLiberacaoFarmacos from "./pages/simuladores/farmacotecnica/SimuladorLiberacaoFarmacos";
import SimuladorDiluicao from "./pages/simuladores/farmacotecnica/SimuladorDiluicao";
import SimuladorReologia from "./pages/simuladores/farmacotecnica/SimuladorReologia";
import SimuladorHLB from "./pages/simuladores/farmacotecnica/SimuladorHLB";
import SimuladorGranulometria from "./pages/simuladores/farmacotecnica/SimuladorGranulometria";
import SimuladorCompressao from "./pages/simuladores/farmacotecnica/SimuladorCompressao";
import SimuladorTampao from "./pages/simuladores/farmacotecnica/SimuladorTampao";
import SimuladorSAR from "./pages/simuladores/quimica-farmaceutica/SimuladorSAR";
import SimuladorLipinski from "./pages/simuladores/quimica-farmaceutica/SimuladorLipinski";
import SimuladorBioisosterismo from "./pages/simuladores/quimica-farmaceutica/SimuladorBioisosterismo";
import SimuladorMetabolismo from "./pages/simuladores/quimica-farmaceutica/SimuladorMetabolismo";
import SimuladorDocking from "./pages/simuladores/quimica-farmaceutica/SimuladorDocking";
import SimuladorQuiralidade from "./pages/simuladores/quimica-farmaceutica/SimuladorQuiralidade";
import SimuladorPkaAbsorcao from "./pages/simuladores/quimica-farmaceutica/SimuladorPkaAbsorcao";
import SimuladorQSAR from "./pages/simuladores/quimica-farmaceutica/SimuladorQSAR";
import SimuladorFeedbackFormativo from "./pages/simuladores/docencia/SimuladorFeedbackFormativo";
import SimuladorElaboracaoQuestoes from "./pages/simuladores/docencia/SimuladorElaboracaoQuestoes";
import SimuladorConducaoCaso from "./pages/simuladores/docencia/SimuladorConducaoCaso";
import SimuladorPlanejamentoAula from "./pages/simuladores/docencia/SimuladorPlanejamentoAula";
import SimuladorGestaoSala from "./pages/simuladores/docencia/SimuladorGestaoSala";
import SimuladorAvaliacaoRubrica from "./pages/simuladores/docencia/SimuladorAvaliacaoRubrica";
import SimuladorPreceptoriaClinica from "./pages/simuladores/docencia/SimuladorPreceptoriaClinica";
import SimuladorOdontograma from "./pages/simuladores/odontologia/SimuladorOdontograma";
import SimuladorAnatomiaEndodontia from "./pages/simuladores/odontologia/SimuladorAnatomiaEndodontia";
import SimuladorPeriodontograma from "./pages/simuladores/odontologia/SimuladorPeriodontograma";
import SimuladorAnestesiologia from "./pages/simuladores/odontologia/SimuladorAnestesiologia";
import SimuladorCefalometria from "./pages/simuladores/odontologia/SimuladorCefalometria";
import SimuladorRadiografia from "./pages/simuladores/odontologia/SimuladorRadiografia";
import SimuladorFarmacologiaOdonto from "./pages/simuladores/odontologia/SimuladorFarmacologiaOdonto";
import SimuladorCirurgiaExodontia from "./pages/simuladores/odontologia/SimuladorCirurgiaExodontia";
import SimuladorGoniometria from "./pages/simuladores/fisioterapia/SimuladorGoniometria";
import SimuladorAvaliacaoPostural from "./pages/simuladores/fisioterapia/SimuladorAvaliacaoPostural";
import SimuladorForcaMuscular from "./pages/simuladores/fisioterapia/SimuladorForcaMuscular";
import SimuladorDermatomos from "./pages/simuladores/fisioterapia/SimuladorDermatomos";
import SimuladorRespiratorioFisio from "./pages/simuladores/fisioterapia/SimuladorRespiratorio";
import SimuladorEletroterapia from "./pages/simuladores/fisioterapia/SimuladorEletroterapia";
import SimuladorTestesOrtopedicos from "./pages/simuladores/fisioterapia/SimuladorTestesOrtopedicos";
import SimuladorBerg from "./pages/simuladores/fisioterapia/SimuladorBerg";
import SimuladorSOAP from "./pages/simuladores/SimuladorSOAP";
import SimuladorMAI from "./pages/simuladores/SimuladorMAI";
import SimuladorCascataPrescricao from "./pages/simuladores/SimuladorCascataPrescricao";
import MinhaConta from "./pages/MinhaConta";
import Planos from "./pages/Planos";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import SalasVirtuais from "./pages/SalasVirtuais";
import SalaVirtualAluno from "./pages/SalaVirtualAluno";
import RedefinirSenha from "./pages/RedefinirSenha";
import Marketplace from "./pages/Marketplace";
import Gamificacao from "./pages/Gamificacao";
import JogosClinicos from "./pages/JogosClinicos";
import LaboratorioVirtual from "./pages/LaboratorioVirtual";
import BancadaFarmacos from "./pages/lab-virtual/BancadaFarmacos";
import BancadaMicrobiologia from "./pages/lab-virtual/BancadaMicrobiologia";
import BancadaToxicologia from "./pages/lab-virtual/BancadaToxicologia";
import BancadaFarmacogenomica from "./pages/lab-virtual/BancadaFarmacogenomica";
import BancadaEstabilidade from "./pages/lab-virtual/BancadaEstabilidade";
import BancadaControleQualidade from "./pages/lab-virtual/BancadaControleQualidade";
import BancadaEpidemiologia from "./pages/lab-virtual/BancadaEpidemiologia";
import BancadaBiotecnologia from "./pages/lab-virtual/BancadaBiotecnologia";
import AgenteFeedback from "./pages/AgenteFeedback";
import EmbedTool from "./pages/EmbedTool";
import Documentacao from "./pages/Documentacao";
import NotFound from "./pages/NotFound";
import TermosDeServico from "./pages/TermosDeServico";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import PoliticaCookies from "./pages/PoliticaCookies";
import Vitrine from "./pages/Vitrine";
import DocumentacaoPublica from "./pages/DocumentacaoPublica";
import ContatoPublico from "./pages/ContatoPublico";

const queryClient = new QueryClient();

function SmartPlanosRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (user) {
    return <AppLayout />;
  }
  return <PublicLayout />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CookieConsentProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/contato" element={<ContatoPublico />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
              <Route path="/termos-de-servico" element={<TermosDeServico />} />
              <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
              <Route path="/politica-cookies" element={<PoliticaCookies />} />
              <Route path="/vitrine" element={<Vitrine />} />
              <Route path="/docs" element={<DocumentacaoPublica />} />
              {/* /planos is handled as a standalone route below */}
              <Route path="/sala" element={<SalaVirtualAluno />} />
              <Route path="/sala/simulador/prm" element={<SimuladorPRM />} />
              <Route path="/sala/simulador/metodo-soap" element={<SimuladorSOAP />} />
              <Route path="/sala/simulador/mai" element={<SimuladorMAI />} />
              <Route path="/sala/simulador/cascata-prescricao" element={<SimuladorCascataPrescricao />} />
              <Route path="/sala/simulador/antimicrobianos" element={<SimuladorAntimicrobianos />} />
              <Route path="/sala/simulador/tdm" element={<SimuladorTDM />} />
              <Route path="/sala/simulador/acompanhamento" element={<SimuladorAcompanhamento />} />
              <Route path="/sala/simulador/insulina" element={<SimuladorInsulina />} />
              <Route path="/sala/simulador/bomba-infusao" element={<SimuladorBombaInfusao />} />
              <Route path="/sala/simulador/desmame-benzo" element={<SimuladorDesmameBenzo />} />
              <Route path="/sala/simulador/interacoes" element={<SimuladorInteracoes />} />
              <Route path="/sala/simulador/sna" element={<SimuladorSNA />} />
              <Route path="/sala/simulador/eletrofisiologia-cardiaca" element={<SimuladorEletrofisiologiaCardiaca />} />
              <Route path="/sala/simulador/depuracao-renal" element={<SimuladorDepuracaoRenal />} />
              <Route path="/sala/simulador/equilibrio-acido-base" element={<SimuladorEquilibrioAcidoBase />} />
              <Route path="/sala/simulador/regulacao-glicemica" element={<SimuladorRegulacaoGlicemica />} />
              <Route path="/sala/simulador/eixo-hpa" element={<SimuladorEixoHPA />} />
              <Route path="/sala/simulador/cinetica-enzimatica" element={<SimuladorCineticaEnzimatica />} />
              <Route path="/sala/simulador/secrecao-gastrica" element={<SimuladorSecrecaoGastrica />} />
              <Route path="/sala/simulador/cascata-coagulacao" element={<SimuladorCascataCoagulacao />} />
              <Route path="/sala/simulador/compartimentos-adme" element={<SimuladorADME />} />
              <Route path="/sala/simulador/cadeia-eletrons" element={<SimuladorCadeiaTransporteEletrons />} />
              <Route path="/sala/simulador/dissociacao-hemoglobina" element={<SimuladorDissociacaoHemoglobina />} />
              <Route path="/sala/simulador/glicolise-gliconeogenese" element={<SimuladorGlicoliseGliconeogenese />} />
              <Route path="/sala/simulador/cinetica-avancada" element={<SimuladorCineticaAvancada />} />
              <Route path="/sala/simulador/ciclo-ureia" element={<SimuladorCicloUreia />} />
              <Route path="/sala/simulador/acido-araquidonico" element={<SimuladorCascataAcidoAraquidonico />} />
              <Route path="/sala/simulador/lipoproteinas" element={<SimuladorLipoproteinas />} />
              <Route path="/sala/simulador/pentoses-fosfato" element={<SimuladorPentosesFosfato />} />
              <Route path="/sala/simulador/titulacao-aminoacidos" element={<SimuladorTitulacaoAminoacidos />} />
              <Route path="/sala/simulador/operon-lac" element={<SimuladorOperonLac />} />
              <Route path="/sala/simulador/dose-resposta" element={<SimuladorDoseResposta />} />
              <Route path="/sala/simulador/transducao-sinal" element={<SimuladorTransducaoSinal />} />
              <Route path="/sala/simulador/janela-terapeutica-farma" element={<SimuladorJanelaTerapeutica />} />
              <Route path="/sala/simulador/vias-administracao" element={<SimuladorViasAdministracao />} />
              <Route path="/sala/simulador/bloqueio-neuromuscular" element={<SimuladorBloqueioNeuromuscular />} />
              <Route path="/sala/simulador/farmaco-autonomica" element={<SimuladorFarmacoAutonomica />} />
              <Route path="/sala/simulador/tolerancia-dependencia" element={<SimuladorToleranciaDependencia />} />
              <Route path="/sala/simulador/farmacogenomica" element={<SimuladorFarmacogenomica />} />
              <Route path="/sala/simulador/estabilidade" element={<SimuladorEstabilidade />} />
              <Route path="/sala/simulador/liberacao-farmacos" element={<SimuladorLiberacaoFarmacos />} />
              <Route path="/sala/simulador/diluicao" element={<SimuladorDiluicao />} />
              <Route path="/sala/simulador/reologia" element={<SimuladorReologia />} />
              <Route path="/sala/simulador/hlb-emulsoes" element={<SimuladorHLB />} />
              <Route path="/sala/simulador/granulometria" element={<SimuladorGranulometria />} />
              <Route path="/sala/simulador/compressao" element={<SimuladorCompressao />} />
              <Route path="/sala/simulador/tampao-farmaceutico" element={<SimuladorTampao />} />
              <Route path="/sala/simulador/sar-explorer" element={<SimuladorSAR />} />
              <Route path="/sala/simulador/lipinski" element={<SimuladorLipinski />} />
              <Route path="/sala/simulador/bioisosterismo" element={<SimuladorBioisosterismo />} />
              <Route path="/sala/simulador/metabolismo-farmacos" element={<SimuladorMetabolismo />} />
              <Route path="/sala/simulador/docking-simplificado" element={<SimuladorDocking />} />
              <Route path="/sala/simulador/quiralidade" element={<SimuladorQuiralidade />} />
              <Route path="/sala/simulador/pka-absorcao" element={<SimuladorPkaAbsorcao />} />
              <Route path="/sala/simulador/qsar-simplificado" element={<SimuladorQSAR />} />
              <Route path="/sala/simulador/odontograma" element={<SimuladorOdontograma />} />
              <Route path="/sala/simulador/anatomia-endodontia" element={<SimuladorAnatomiaEndodontia />} />
              <Route path="/sala/simulador/periodontograma" element={<SimuladorPeriodontograma />} />
              <Route path="/sala/simulador/anestesiologia-odonto" element={<SimuladorAnestesiologia />} />
              <Route path="/sala/simulador/cefalometria" element={<SimuladorCefalometria />} />
              <Route path="/sala/simulador/radiografia-odonto" element={<SimuladorRadiografia />} />
              <Route path="/sala/simulador/farmacologia-odonto" element={<SimuladorFarmacologiaOdonto />} />
              <Route path="/sala/simulador/cirurgia-exodontia" element={<SimuladorCirurgiaExodontia />} />
              <Route path="/sala/simulador/goniometria" element={<SimuladorGoniometria />} />
              <Route path="/sala/simulador/avaliacao-postural" element={<SimuladorAvaliacaoPostural />} />
              <Route path="/sala/simulador/forca-muscular" element={<SimuladorForcaMuscular />} />
              <Route path="/sala/simulador/dermatomos" element={<SimuladorDermatomos />} />
              <Route path="/sala/simulador/respiratorio" element={<SimuladorRespiratorioFisio />} />
              <Route path="/sala/simulador/eletroterapia" element={<SimuladorEletroterapia />} />
              <Route path="/sala/simulador/testes-ortopedicos" element={<SimuladorTestesOrtopedicos />} />
              <Route path="/sala/simulador/berg" element={<SimuladorBerg />} />
            </Route>

            {/* Authenticated routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calculadoras" element={<Calculadoras />} />
              <Route path="/simuladores" element={<Simuladores />} />
              <Route path="/simuladores/prm" element={<SimuladorPRM />} />
              <Route path="/simuladores/metodo-soap" element={<SimuladorSOAP />} />
              <Route path="/simuladores/mai" element={<SimuladorMAI />} />
              <Route path="/simuladores/cascata-prescricao" element={<SimuladorCascataPrescricao />} />
              <Route path="/simuladores/antimicrobianos" element={<SimuladorAntimicrobianos />} />
              <Route path="/simuladores/tdm" element={<SimuladorTDM />} />
              <Route path="/simuladores/acompanhamento" element={<SimuladorAcompanhamento />} />
              <Route path="/simuladores/insulina" element={<SimuladorInsulina />} />
              <Route path="/simuladores/bomba-infusao" element={<SimuladorBombaInfusao />} />
              <Route path="/simuladores/desmame-benzo" element={<SimuladorDesmameBenzo />} />
              <Route path="/simuladores/interacoes" element={<SimuladorInteracoes />} />
              <Route path="/simuladores/sna" element={<SimuladorSNA />} />
              <Route path="/simuladores/eletrofisiologia-cardiaca" element={<SimuladorEletrofisiologiaCardiaca />} />
              <Route path="/simuladores/depuracao-renal" element={<SimuladorDepuracaoRenal />} />
              <Route path="/simuladores/equilibrio-acido-base" element={<SimuladorEquilibrioAcidoBase />} />
              <Route path="/simuladores/regulacao-glicemica" element={<SimuladorRegulacaoGlicemica />} />
              <Route path="/simuladores/eixo-hpa" element={<SimuladorEixoHPA />} />
              <Route path="/simuladores/cinetica-enzimatica" element={<SimuladorCineticaEnzimatica />} />
              <Route path="/simuladores/secrecao-gastrica" element={<SimuladorSecrecaoGastrica />} />
              <Route path="/simuladores/cascata-coagulacao" element={<SimuladorCascataCoagulacao />} />
              <Route path="/simuladores/compartimentos-adme" element={<SimuladorADME />} />
              <Route path="/simuladores/cadeia-eletrons" element={<SimuladorCadeiaTransporteEletrons />} />
              <Route path="/simuladores/dissociacao-hemoglobina" element={<SimuladorDissociacaoHemoglobina />} />
              <Route path="/simuladores/glicolise-gliconeogenese" element={<SimuladorGlicoliseGliconeogenese />} />
              <Route path="/simuladores/cinetica-avancada" element={<SimuladorCineticaAvancada />} />
              <Route path="/simuladores/ciclo-ureia" element={<SimuladorCicloUreia />} />
              <Route path="/simuladores/acido-araquidonico" element={<SimuladorCascataAcidoAraquidonico />} />
              <Route path="/simuladores/lipoproteinas" element={<SimuladorLipoproteinas />} />
              <Route path="/simuladores/pentoses-fosfato" element={<SimuladorPentosesFosfato />} />
              <Route path="/simuladores/titulacao-aminoacidos" element={<SimuladorTitulacaoAminoacidos />} />
              <Route path="/simuladores/operon-lac" element={<SimuladorOperonLac />} />
              <Route path="/simuladores/dose-resposta" element={<SimuladorDoseResposta />} />
              <Route path="/simuladores/transducao-sinal" element={<SimuladorTransducaoSinal />} />
              <Route path="/simuladores/janela-terapeutica-farma" element={<SimuladorJanelaTerapeutica />} />
              <Route path="/simuladores/vias-administracao" element={<SimuladorViasAdministracao />} />
              <Route path="/simuladores/bloqueio-neuromuscular" element={<SimuladorBloqueioNeuromuscular />} />
              <Route path="/simuladores/farmaco-autonomica" element={<SimuladorFarmacoAutonomica />} />
              <Route path="/simuladores/tolerancia-dependencia" element={<SimuladorToleranciaDependencia />} />
              <Route path="/simuladores/farmacogenomica" element={<SimuladorFarmacogenomica />} />
              <Route path="/simuladores/estabilidade" element={<SimuladorEstabilidade />} />
              <Route path="/simuladores/liberacao-farmacos" element={<SimuladorLiberacaoFarmacos />} />
              <Route path="/simuladores/diluicao" element={<SimuladorDiluicao />} />
              <Route path="/simuladores/reologia" element={<SimuladorReologia />} />
              <Route path="/simuladores/hlb-emulsoes" element={<SimuladorHLB />} />
              <Route path="/simuladores/granulometria" element={<SimuladorGranulometria />} />
              <Route path="/simuladores/compressao" element={<SimuladorCompressao />} />
              <Route path="/simuladores/tampao-farmaceutico" element={<SimuladorTampao />} />
              <Route path="/simuladores/sar-explorer" element={<SimuladorSAR />} />
              <Route path="/simuladores/lipinski" element={<SimuladorLipinski />} />
              <Route path="/simuladores/bioisosterismo" element={<SimuladorBioisosterismo />} />
              <Route path="/simuladores/metabolismo-farmacos" element={<SimuladorMetabolismo />} />
              <Route path="/simuladores/docking-simplificado" element={<SimuladorDocking />} />
              <Route path="/simuladores/quiralidade" element={<SimuladorQuiralidade />} />
              <Route path="/simuladores/pka-absorcao" element={<SimuladorPkaAbsorcao />} />
              <Route path="/simuladores/qsar-simplificado" element={<SimuladorQSAR />} />
              <Route path="/simuladores/feedback-formativo" element={<SimuladorFeedbackFormativo />} />
              <Route path="/simuladores/elaboracao-questoes" element={<SimuladorElaboracaoQuestoes />} />
              <Route path="/simuladores/conducao-caso-pbl" element={<SimuladorConducaoCaso />} />
              <Route path="/simuladores/planejamento-aula" element={<SimuladorPlanejamentoAula />} />
              <Route path="/simuladores/gestao-sala" element={<SimuladorGestaoSala />} />
              <Route path="/simuladores/avaliacao-rubrica-osce" element={<SimuladorAvaliacaoRubrica />} />
              <Route path="/simuladores/preceptoria-clinica" element={<SimuladorPreceptoriaClinica />} />
              <Route path="/simuladores/odontograma" element={<SimuladorOdontograma />} />
              <Route path="/simuladores/anatomia-endodontia" element={<SimuladorAnatomiaEndodontia />} />
              <Route path="/simuladores/periodontograma" element={<SimuladorPeriodontograma />} />
              <Route path="/simuladores/anestesiologia-odonto" element={<SimuladorAnestesiologia />} />
              <Route path="/simuladores/cefalometria" element={<SimuladorCefalometria />} />
              <Route path="/simuladores/radiografia-odonto" element={<SimuladorRadiografia />} />
              <Route path="/simuladores/farmacologia-odonto" element={<SimuladorFarmacologiaOdonto />} />
              <Route path="/simuladores/cirurgia-exodontia" element={<SimuladorCirurgiaExodontia />} />
              <Route path="/calculadoras/risco-cardiovascular" element={<RiscoCardiovascular />} />
              <Route path="/calculadoras/desmame-corticoide" element={<DesmaCorticoide />} />
              <Route path="/calculadoras/equivalencia-opioides" element={<EquivalenciaOpioides />} />
              <Route path="/calculadoras/ajuste-dose-renal" element={<AjusteDoseRenal />} />
              <Route path="/calculadoras/equivalencia-antidepressivos" element={<EquivalenciaAntidepressivos />} />
              <Route path="/calculadoras/homa-ir" element={<HomaIR />} />
              <Route path="/calculadoras/findrisc" element={<Findrisc />} />
              <Route path="/calculadoras/ckd-epi" element={<CkdEpi />} />
              <Route path="/calculadoras/correcao-sodio" element={<CorrecaoSodio />} />
              <Route path="/calculadoras/correcao-calcio" element={<CorrecaoCalcio />} />
              <Route path="/calculadoras/wells-score" element={<WellsScore />} />
              <Route path="/calculadoras/qsofa" element={<QSofa />} />
              <Route path="/calculadoras/vancomicina-auc" element={<VancomicinaAUC />} />
              <Route path="/calculadoras/insulina-basal-bolus" element={<InsulinaBasalBolus />} />
              <Route path="/calculadoras/holliday-segar" element={<HollidaySegar />} />
              <Route path="/calculadoras/meld-score" element={<MeldScore />} />
              <Route path="/calculadoras/qtc-corrigido" element={<QTcCorrigido />} />
              <Route path="/calculadoras/dose-pediatrica" element={<DosePediatrica />} />
              <Route path="/calculadoras/rass-sedacao" element={<RassSas />} />
              <Route path="/calculadoras/nutricao-parenteral" element={<NutricaoParenteral />} />
              <Route path="/calculadoras/interacoes-cyp" element={<InteracoesCYP />} />
              <Route path="/calculadoras/:slug" element={<ToolDetail />} />
              <Route path="/simuladores/:slug" element={<ToolDetail />} />
              <Route path="/minha-conta" element={<MinhaConta />} />
              {/* /planos is handled as a standalone route below */}
              <Route path="/salas-virtuais" element={<SalasVirtuais />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/gamificacao" element={<Gamificacao />} />
              <Route path="/jogos-clinicos" element={<JogosClinicos />} />
              <Route path="/agente-feedback" element={<AgenteFeedback />} />
              <Route path="/laboratorio-virtual" element={<LaboratorioVirtual />} />
              <Route path="/laboratorio-virtual/farmacos" element={<BancadaFarmacos />} />
              <Route path="/laboratorio-virtual/microbiologia" element={<BancadaMicrobiologia />} />
              <Route path="/laboratorio-virtual/toxicologia" element={<BancadaToxicologia />} />
              <Route path="/laboratorio-virtual/farmacogenomica" element={<BancadaFarmacogenomica />} />
              <Route path="/laboratorio-virtual/estabilidade" element={<BancadaEstabilidade />} />
              <Route path="/laboratorio-virtual/controle-qualidade" element={<BancadaControleQualidade />} />
              <Route path="/laboratorio-virtual/epidemiologia" element={<BancadaEpidemiologia />} />
              <Route path="/laboratorio-virtual/biotecnologia" element={<BancadaBiotecnologia />} />
              <Route path="/documentacao" element={<Documentacao />} />
            </Route>

            {/* Admin routes */}
            <Route element={<AdminRoute><AppLayout /></AdminRoute>}>
              <Route path="/admin" element={<Admin />} />
            </Route>

            {/* Smart Planos route - renders with sidebar for logged-in users */}
            <Route path="/planos" element={<SmartPlanosRoute />}>
              <Route index element={<Planos />} />
            </Route>

            {/* Public embed route */}
            <Route path="/embed/:token" element={<EmbedTool />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsentBanner />
        </BrowserRouter>
      </TooltipProvider>
      </CookieConsentProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
