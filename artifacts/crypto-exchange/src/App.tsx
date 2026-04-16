import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Trade from "@/pages/Trade";
import Wallet from "@/pages/Wallet";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  const isTrading = location === "/trade";

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Navbar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/trade" component={Trade} />
          <Route path="/wallet" component={Wallet} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!isTrading && <Footer />}
    </div>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
