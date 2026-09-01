import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';

// Views
import { ActivitiesView } from './components/activities/ActivitiesView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SalesView } from './components/sales/SalesView';
import { CustomersView } from './components/customers/CustomersView';
import { CustomerDetailView } from './components/customers/CustomerDetailView';
import { InventoryView } from './components/inventory/InventoryView';
import { DispensersView } from './components/dispensers/DispensersView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';

// Global Modals
import { AddActivityModal } from './components/activities/AddActivityModal';
import { EditActivityModal } from './components/activities/EditActivityModal';
import { NewSaleModal } from './components/sales/NewSaleModal';
import { CustomerFormModal } from './components/customers/CustomerFormModal';
import { AddProductModal } from './components/inventory/AddProductModal';
import { AddStockModal } from './components/inventory/AddStockModal';
import { AddPaymentModal } from './components/sales/AddPaymentModal';
import { ToastContainer } from './components/common/Toast';

const AppContent: React.FC = () => {
  const {
    activeTab,
    selectedCustomerId,
    isNewSaleModalOpen,
    setIsNewSaleModalOpen,
    isAddCustomerModalOpen,
    setIsAddCustomerModalOpen,
    isAddProductModalOpen,
    setIsAddProductModalOpen,
    isAddStockModalOpen,
    setIsAddStockModalOpen,
    isAddPaymentModalOpen,
    setIsAddPaymentModalOpen,
  } = useApp();

  return (
    <div className="flex h-screen w-full font-sans text-slate-800 bg-[#f8fafc] overflow-hidden antialiased selection:bg-emerald-500 selection:text-white">
      {/* Desktop Navigation Sidebar */}
      <Sidebar />

      {/* Primary App Shell */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Sticky Top Header with search, date selector & quick actions */}
        <Header />

        {/* Scrollable View Area */}
        <main
          id="main-scroll-viewport"
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto pb-24 md:pb-12 scroll-smooth"
        >
          {activeTab === 'activities' && <ActivitiesView />}
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'sales' && <SalesView />}
          {activeTab === 'customers' && (
            selectedCustomerId ? <CustomerDetailView /> : <CustomersView />
          )}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'dispensers' && <DispensersView />}
          {activeTab === 'expenses' && <ExpensesView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* Mobile Responsive Bottom Navigation */}
        <BottomNav />
      </div>

      {/* Global Application Modals */}
      <AddActivityModal />
      <EditActivityModal />

      <NewSaleModal
        isOpen={isNewSaleModalOpen}
        onClose={() => setIsNewSaleModalOpen(false)}
      />

      <CustomerFormModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
      />

      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
      />

      <AddStockModal
        isOpen={isAddStockModalOpen}
        onClose={() => setIsAddStockModalOpen(false)}
        product={null}
      />

      <AddPaymentModal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        sale={null}
      />

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
