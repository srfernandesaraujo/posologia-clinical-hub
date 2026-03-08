import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import EmbedTool from "./pages/EmbedTool";
import Documentacao from "./pages/Documentacao";
import NotFound from "./pages/NotFound";
import TermosDeServico from "./pages/TermosDeServico";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import PoliticaCookies from "./pages/PoliticaCookies";
import Vitrine from "./pages/Vitrine";
import DocumentacaoPublica from "./pages/DocumentacaoPublica";
import ContatoPublico from "./pages/ContatoPublico";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
              <Route path="/planos" element={<Planos />} />
              <Route path="/sala" element={<SalaVirtualAluno />} />
              <Route path="/sala/simulador/prm" element={<SimuladorPRM />} />
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
            </Route>

            {/* Authenticated routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calculadoras" element={<Calculadoras />} />
              <Route path="/simuladores" element={<Simuladores />} />
              <Route path="/simuladores/prm" element={<SimuladorPRM />} />
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
              <Route path="/planos" element={<Planos />} />
              <Route path="/salas-virtuais" element={<SalasVirtuais />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/gamificacao" element={<Gamificacao />} />
              <Route path="/jogos-clinicos" element={<JogosClinicos />} />
              <Route path="/documentacao" element={<Documentacao />} />
            </Route>

            {/* Admin routes */}
            <Route element={<AdminRoute><AppLayout /></AdminRoute>}>
              <Route path="/admin" element={<Admin />} />
            </Route>

            {/* Public embed route */}
            <Route path="/embed/:token" element={<EmbedTool />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
