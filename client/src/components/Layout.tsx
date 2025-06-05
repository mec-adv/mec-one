import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getInitials, getFullName, getProfileLabel } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Building2,
  UsersRound,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout, isLogoutLoading } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao realizar logout.",
        variant: "destructive",
      });
    }
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      current: location === "/",
    },
    {
      name: "Usuários",
      href: "/users",
      icon: Users,
      current: location === "/users",
    },
    {
      name: "Entidades",
      href: "/entities",
      icon: Building2,
      current: location === "/entities",
    },
    {
      name: "Grupos de Trabalho",
      href: "/work-groups",
      icon: UsersRound,
      current: location === "/work-groups",
    },
  ];

  const pageTitle = {
    "/": { title: "Dashboard", subtitle: "Visão geral do sistema" },
    "/users": { title: "Usuários", subtitle: "Gerencie usuários e permissões" },
    "/entities": { title: "Entidades", subtitle: "Gerencie pessoas físicas e jurídicas" },
    "/work-groups": { title: "Grupos de Trabalho", subtitle: "Organize usuários em grupos" },
  }[location] || { title: "MeC ONE", subtitle: "Sistema de Gestão Jurídica" };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">MeC ONE</h1>
                <p className="text-xs text-gray-500">Módulo 1</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                      item.current
                        ? "bg-primary-50 text-primary-700 border border-primary-200"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {getInitials(user?.firstName, user?.lastName)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getFullName(user?.firstName, user?.lastName)}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.profile ? getProfileLabel(user.profile) : ""}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleLogout}
              disabled={isLogoutLoading}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isLogoutLoading ? "Saindo..." : "Sair"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{pageTitle.title}</h2>
                <p className="text-gray-600 mt-1">{pageTitle.subtitle}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
