"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { backendApi } from "../lib/backend-api";
import type { GroupData, Rooftop, Order } from "../lib/types";
import Sidebar, { type NavKey } from "../components/Sidebar";
import Header from "../components/Header";
import LoginPage from "../components/LoginPage";

// Modular Pages
import OverviewPage from "../components/pages/OverviewPage";
import OrdersPage from "../components/pages/OrdersPage";
import PartsPage from "../components/pages/PartsPage";
import PartsCheckPage from "../components/pages/PartsCheckPage";
import AccountsPage from "../components/pages/AccountsPage";
import PrecinctsPage from "../components/pages/PrecinctsPage";
import ActivityLogPage from "../components/pages/ActivityLogPage";

function AppContent() {
  const { user, token, loading: authLoading, login, register } = useAuth();
  const [activePage, setActivePage] = useState<NavKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRooftop, setSelectedRooftop] = useState("ROOFTOP-DANDENONG");

  // Global Data
  const [group, setGroup] = useState<GroupData | null>(null);
  const [rooftops, setRooftops] = useState<Rooftop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadGlobalData = useCallback(async () => {
    if (!token) return;
    setDataLoading(true);
    try {
      const canReadGroupDashboard = ["admin", "controller", "csuites", "group_admin", "store_manager"].includes(
        (user?.role || "").toLowerCase()
      );
      const [gRes, rRes, oRes] = await Promise.allSettled([
        canReadGroupDashboard
          ? backendApi.dashboard.group()
          : Promise.resolve(null),
        backendApi.rooftops.list(),
        backendApi.orders.list("limit=20"),
      ]);

      if (gRes.status === "fulfilled") setGroup(gRes.value);
      if (rRes.status === "fulfilled") {
        setRooftops(rRes.value);
        if (user?.rooftopId) setSelectedRooftop(user.rooftopId);
      }
      if (oRes.status === "fulfilled") {
        const val = oRes.value;
        setOrders(val.orders || val.results || []);
      }
    } catch (e) {
      console.error("Failed to load initial workspace data", e);
    } finally {
      setDataLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    loadGlobalData();
  }, [loadGlobalData, refreshTrigger]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white font-black text-2xl shadow-xl shadow-red-600/30 mb-4 animate-pulse">
          B
        </div>
        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="w-full h-full bg-red-600 rounded-full animate-[shimmer_1.5s_infinite]" />
        </div>
        <p className="text-xs text-slate-400 mt-3 font-semibold">
          Connecting to Booran Motor Group API...
        </p>
      </div>
    );
  }

  if (!token) {
    return <LoginPage onLogin={login} onRegister={register} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* ─── Responsive Sidebar (Fixed desktop, Drawer mobile) ─── */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        partsCheckBadge={4}
      />

      {/* ─── Main Content Canvas ─── */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[270px] transition-all duration-300">
        <Header
          activePage={activePage}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          selectedRooftop={selectedRooftop}
          onSelectRooftop={setSelectedRooftop}
          rooftops={rooftops}
        />

        <main className="flex-1 p-4 xs:p-6 sm:p-8 max-w-[1550px] w-full mx-auto">
          {activePage === "overview" && (
            <OverviewPage
              group={group}
              rooftops={rooftops}
              orders={orders}
              onPage={setActivePage}
              selectedRooftop={selectedRooftop}
            />
          )}

          {activePage === "orders" && (
            <OrdersPage
              selectedRooftop={selectedRooftop}
              onRefreshNeeded={() => setRefreshTrigger((x) => x + 1)}
            />
          )}

          {activePage === "parts" && (
            <PartsPage
              selectedRooftop={selectedRooftop}
              onRefreshNeeded={() => setRefreshTrigger((x) => x + 1)}
            />
          )}

          {activePage === "partscheck" && (
            <PartsCheckPage
              selectedRooftop={selectedRooftop}
              onRefreshNeeded={() => setRefreshTrigger((x) => x + 1)}
            />
          )}

          {activePage === "accounts" && (
            <AccountsPage
              selectedRooftop={selectedRooftop}
              onRefreshNeeded={() => setRefreshTrigger((x) => x + 1)}
            />
          )}

          {activePage === "precincts" && (
            <PrecinctsPage
              selectedRooftop={selectedRooftop}
              onSelectRooftop={setSelectedRooftop}
              onRefreshNeeded={() => setRefreshTrigger((x) => x + 1)}
              canManageRooftops={["admin", "group_admin"].includes((user?.role || "").toLowerCase())}
            />
          )}

          {activePage === "activity" && (
            <ActivityLogPage selectedRooftop={selectedRooftop} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
