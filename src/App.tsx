import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SketchLeafBackground from "./components/SketchLeafBackground";
import { Auth0Provider } from "@auth0/auth0-react";

const queryClient = new QueryClient();

const App = () => {
  return (
  <Auth0Provider
    domain={import.meta.env.VITE_AUTH0_DOMAIN || "YOUR_AUTH0_DOMAIN"}
    clientId={import.meta.env.VITE_AUTH0_CLIENT_ID || "YOUR_AUTH0_CLIENT_ID"}
    authorizationParams={{
      redirect_uri: window.location.origin + '/app'
    }}
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <SketchLeafBackground />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </Auth0Provider>
  );
};

export default App;
