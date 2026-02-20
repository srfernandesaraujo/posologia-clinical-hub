import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
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
import MinhaConta from "./pages/MinhaConta";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
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
            </Route>

            {/* Authenticated routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calculadoras" element={<Calculadoras />} />
              <Route path="/simuladores" element={<Simuladores />} />
              <Route path="/calculadoras/risco-cardiovascular" element={<RiscoCardiovascular />} />
              <Route path="/calculadoras/desmame-corticoide" element={<DesmaCorticoide />} />
              <Route path="/calculadoras/:slug" element={<ToolDetail />} />
              <Route path="/simuladores/:slug" element={<ToolDetail />} />
              <Route path="/minha-conta" element={<MinhaConta />} />
            </Route>

            {/* Admin routes */}
            <Route element={<AdminRoute><AppLayout /></AdminRoute>}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/analytics" element={<Analytics />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
