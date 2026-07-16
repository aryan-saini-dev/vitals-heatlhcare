import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";

// Dashboard Imports
import DashboardLayout from "./components/dashboard/DashboardLayout.tsx";
import Overview from "./pages/dashboard/Overview.tsx";
import Patients from "./pages/dashboard/Patients.tsx";
import AddPatient from "./pages/dashboard/AddPatient.tsx";
import PatientDetail from "./pages/dashboard/PatientDetail.tsx";
import Agents from "./pages/dashboard/Agents.tsx";
import CreateAgent from "./pages/dashboard/CreateAgent.tsx";
import Alerts from "./pages/dashboard/Alerts.tsx";
import Calls from "./pages/dashboard/Calls.tsx";
import CallDetail from "./pages/dashboard/CallDetail.tsx";
import SimulateCall from "./pages/dashboard/SimulateCall.tsx";
import MediLink from "./pages/dashboard/MediLink.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Overview />} />
              <Route path="patients" element={<Patients />} />
              <Route path="patients/add" element={<AddPatient />} />
              <Route path="patients/:id" element={<PatientDetail />} />
              <Route path="agents" element={<Agents />} />
              <Route path="agents/create" element={<CreateAgent />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="calls" element={<Calls />} />
              <Route path="calls/simulate" element={<SimulateCall />} />
              <Route path="calls/:id" element={<CallDetail />} />
              <Route path="medilink" element={<MediLink />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
