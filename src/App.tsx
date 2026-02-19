import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import NewPost from "@/pages/NewPost";
import CalendarView from "@/pages/CalendarView";
import Scheduled from "@/pages/Scheduled";
import NotFound from "@/pages/NotFound";
import LoginPage from "@/pages/LoginPage";
import InstagramConnectCallback from "@/pages/InstagramConnectCallback";
import GoogleDriveCallback from "@/pages/GoogleDriveCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Callback do Google fora do ProtectedRoute: ao voltar do OAuth a sessão pode ainda não estar
              reidratada; aqui a página carrega e o GoogleDriveCallback espera a sessão (waitForSession). */}
          <Route path="/new-post/drive/callback" element={<GoogleDriveCallback />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/connect/instagram/callback" element={<InstagramConnectCallback />} />
            <Route path="/new-post" element={<NewPost />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/scheduled" element={<Scheduled />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
