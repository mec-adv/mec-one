import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getInitials, getFullName, getProfileLabel, canManageUsers, canDeleteUsers } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import UserModal from "./UserModal";
import { Plus, Search, Edit, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profile: string;
  isActive: boolean;
  lastLogin?: string;
  userWorkGroups: Array<{
    workGroup: {
      id: string;
      name: string;
    };
  }>;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [profileFilter, setProfileFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users", { 
      search, 
      profile: profileFilter === "all" ? undefined : profileFilter, 
      isActive: statusFilter === "all" ? undefined : statusFilter 
    }],
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário removido",
        description: "O usuário foi desativado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o usuário.",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (confirm(`Tem certeza que deseja remover o usuário ${getFullName(user.firstName, user.lastName)}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const canManage = canManageUsers(currentUser?.profile || "");
  const canDelete = canDeleteUsers(currentUser?.profile || "");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <p className="text-gray-600 mt-1">Gerencie usuários, perfis e permissões</p>
            </div>
            {canManage && (
              <Button onClick={handleAddUser}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar usuários..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos os perfis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                <SelectItem value="ADMINISTRATOR">Administrador</SelectItem>
                <SelectItem value="MANAGER">Gerente</SelectItem>
                <SelectItem value="COORDINATOR">Coordenador</SelectItem>
                <SelectItem value="NEGOTIATOR">Negociador</SelectItem>
                <SelectItem value="LAWYER">Advogado</SelectItem>
                <SelectItem value="CONTROLLER">Controller</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="true">Ativo</SelectItem>
                <SelectItem value="false">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {getInitials(user.firstName, user.lastName)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {getFullName(user.firstName, user.lastName)}
                            </p>
                            <p className="text-sm text-gray-500">#{user.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getProfileLabel(user.profile)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {user.userWorkGroups.length > 0 
                          ? user.userWorkGroups[0].workGroup.name 
                          : "Nenhum"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString("pt-BR") 
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canManage && (
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {users.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{users.length}</span> usuário(s)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Modal */}
      <UserModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        user={editingUser}
      />
    </div>
  );
}
