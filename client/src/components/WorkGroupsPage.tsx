import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getInitials, canManageWorkGroups, canDeleteWorkGroups } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import WorkGroupModal from "./WorkGroupModal";
import { Plus, Search, Edit, Trash2, Users } from "lucide-react";

interface WorkGroup {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  userWorkGroups: Array<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

export default function WorkGroupsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WorkGroup | null>(null);

  const { data: workGroups = [], isLoading } = useQuery<WorkGroup[]>({
    queryKey: ["/api/work-groups", { 
      search, 
      isActive: statusFilter === "all" ? undefined : statusFilter 
    }],
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest("DELETE", `/api/work-groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-groups"] });
      toast({
        title: "Grupo removido",
        description: "O grupo de trabalho foi desativado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o grupo de trabalho.",
        variant: "destructive",
      });
    },
  });

  const handleEditGroup = (group: WorkGroup) => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleDeleteGroup = async (group: WorkGroup) => {
    if (confirm(`Tem certeza que deseja remover o grupo "${group.name}"?`)) {
      deleteMutation.mutate(group.id);
    }
  };

  const handleAddGroup = () => {
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  const canManage = canManageWorkGroups(currentUser?.profile || "");
  const canDelete = canDeleteWorkGroups(currentUser?.profile || "");

  const filteredGroups = workGroups.filter(group => {
    const matchesSearch = search === "" || 
      group.name.toLowerCase().includes(search.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === "" ||
      (statusFilter === "true" && group.isActive) ||
      (statusFilter === "false" && !group.isActive);

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
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
              <CardTitle>Grupos de Trabalho</CardTitle>
              <p className="text-gray-600 mt-1">Organize usuários em grupos com permissões específicas</p>
            </div>
            {canManage && (
              <Button onClick={handleAddGroup}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Grupo
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
                placeholder="Buscar grupos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
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

          {/* Groups Grid */}
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum grupo encontrado</h3>
              <p className="text-gray-500 mb-4">
                {search || statusFilter 
                  ? "Tente ajustar os filtros de busca." 
                  : "Comece criando seu primeiro grupo de trabalho."}
              </p>
              {canManage && !search && !statusFilter && (
                <Button onClick={handleAddGroup}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Grupo
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary-600" />
                      </div>
                      {(canManage || canDelete) && (
                        <div className="flex space-x-2">
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditGroup(group)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGroup(group)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{group.name}</h4>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {group.description || "Sem descrição"}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">
                          {group.userWorkGroups.length}
                        </span>
                        <span className="text-sm text-gray-500">
                          {group.userWorkGroups.length === 1 ? "membro" : "membros"}
                        </span>
                      </div>
                      <Badge variant={group.isActive ? "default" : "secondary"}>
                        {group.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    
                    {/* Member avatars */}
                    <div className="flex -space-x-2">
                      {group.userWorkGroups.slice(0, 3).map((userGroup, index) => (
                        <div
                          key={userGroup.user.id}
                          className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center"
                          title={`${userGroup.user.firstName} ${userGroup.user.lastName}`}
                        >
                          <span className="text-xs font-medium text-gray-600">
                            {getInitials(userGroup.user.firstName, userGroup.user.lastName)}
                          </span>
                        </div>
                      ))}
                      {group.userWorkGroups.length > 3 && (
                        <div className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            +{group.userWorkGroups.length - 3}
                          </span>
                        </div>
                      )}
                      {group.userWorkGroups.length === 0 && (
                        <div className="text-xs text-gray-500">Nenhum membro</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Summary */}
          {filteredGroups.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{filteredGroups.length}</span> grupo(s)
              </p>
              <div className="text-sm text-gray-500">
                {filteredGroups.reduce((total, group) => total + group.userWorkGroups.length, 0)} membros no total
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Group Modal */}
      <WorkGroupModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        workGroup={editingGroup}
      />
    </div>
  );
}
