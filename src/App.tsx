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
import SimuladorPRM from "./pages/simuladores/SimuladorPRM";
import SimuladorAntimicrobianos from "./pages/simuladores/SimuladorAntimicrobianos";
import SimuladorTDM from "./pages/simuladores/SimuladorTDM";
import SimuladorAcompanhamento from "./pages/simuladores/SimuladorAcompanhamento";
import SimuladorInsulina from "./pages/simuladores/SimuladorInsulina";
import SimuladorBombaInfusao from "./pages/simuladores/SimuladorBombaInfusao";
import MinhaConta from "./pages/MinhaConta";
import Planos from "./pages/Planos";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import SalasVirtuais from "./pages/SalasVirtuais";
import SalaVirtualAluno from "./pages/SalaVirtualAluno";
import RedefinirSenha from "./pages/RedefinirSenha";
import Marketplace from "./pages/Marketplace";
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
              <Route path="/contato" element={<Contato />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
              <Route path="/sala" element={<SalaVirtualAluno />} />
              <Route path="/sala/simulador/prm" element={<SimuladorPRM />} />
              <Route path="/sala/simulador/antimicrobianos" element={<SimuladorAntimicrobianos />} />
              <Route path="/sala/simulador/tdm" element={<SimuladorTDM />} />
              <Route path="/sala/simulador/acompanhamento" element={<SimuladorAcompanhamento />} />
              <Route path="/sala/simulador/insulina" element={<SimuladorInsulina />} />
              <Route path="/sala/simulador/bomba-infusao" element={<SimuladorBombaInfusao />} />
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
              <Route path="/calculadoras/risco-cardiovascular" element={<RiscoCardiovascular />} />
              <Route path="/calculadoras/desmame-corticoide" element={<DesmaCorticoide />} />
              <Route path="/calculadoras/equivalencia-opioides" element={<EquivalenciaOpioides />} />
              <Route path="/calculadoras/ajuste-dose-renal" element={<AjusteDoseRenal />} />
              <Route path="/calculadoras/equivalencia-antidepressivos" element={<EquivalenciaAntidepressivos />} />
              <Route path="/calculadoras/homa-ir" element={<HomaIR />} />
              <Route path="/calculadoras/findrisc" element={<Findrisc />} />
              <Route path="/calculadoras/:slug" element={<ToolDetail />} />
              <Route path="/simuladores/:slug" element={<ToolDetail />} />
              <Route path="/minha-conta" element={<MinhaConta />} />
              <Route path="/planos" element={<Planos />} />
              <Route path="/salas-virtuais" element={<SalasVirtuais />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/marketplace" element={<Marketplace />} />
            </Route>

            {/* Admin routes */}
            <Route element={<AdminRoute><AppLayout /></AdminRoute>}>
              <Route path="/admin" element={<Admin />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
