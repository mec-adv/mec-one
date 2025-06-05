import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profile: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin?: string;
  workGroups: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        return null; // No token, user is not authenticated
      }
      
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${accessToken}`,
      };

      const res = await fetch("/api/auth/me", {
        headers,
        credentials: "include",
      });

      if (res.status === 401) {
        // Token is invalid, clear it and return null
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return null;
      }

      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      return await res.json();
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData): Promise<LoginResponse> => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      refetch();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem("refreshToken");
      await apiRequest("POST", "/api/auth/logout", { refreshToken });
    },
    onSuccess: () => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      refetch();
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    isForgotPasswordLoading: forgotPasswordMutation.isPending,
    loginError: loginMutation.error,
    forgotPasswordError: forgotPasswordMutation.error,
  };
}
