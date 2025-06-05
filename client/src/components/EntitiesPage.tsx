import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDocument } from "@/lib/validators";
import EntityModal from "./EntityModal";
import { Plus, Search, Edit, Trash2, MoreHorizontal, Eye } from "lucide-react";
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

interface Entity {
  id: string;
  type: "INDIVIDUAL" | "COMPANY";
  name: string;
  document: string;
  isActive: boolean;
  createdAt: string;
  addresses: Array<{
    id: string;
    street: string;
    city: string;
    state: string;
    isPrimary: boolean;
  }>;
  contacts: Array<{
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    status: string;
  }>;
}

export default function EntitiesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const { data: entities = [], isLoading } = useQuery<Entity[]>({
    queryKey: ["/api/entities", { 
      search, 
      type: typeFilter === "all" ? undefined : typeFilter, 
      isActive: statusFilter === "all" ? undefined : statusFilter 
    }],
  });

  const deleteMutation = useMutation({
    mutationFn: async (entityId: string) => {
      await apiRequest("DELETE", `/api/entities/${entityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      toast({
        title: "Entidade removida",
        description: "A entidade foi desativada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível remover a entidade.",
        variant: "destructive",
      });
    },
  });

  const handleEditEntity = (entity: Entity) => {
    setEditingEntity(entity);
    setIsModalOpen(true);
  };

  const handleDeleteEntity = async (entity: Entity) => {
    if (confirm(`Tem certeza que deseja remover a entidade ${entity.name}?`)) {
      deleteMutation.mutate(entity.id);
    }
  };

  const handleAddEntity = () => {
    setEditingEntity(null);
    setIsModalOpen(true);
  };

  const getTypeLabel = (type: string) => {
    return type === "INDIVIDUAL" ? "Pessoa Física" : "Pessoa Jurídica";
  };

  const getTypeColor = (type: string) => {
    return type === "INDIVIDUAL" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
  };

  const getPrimaryContact = (entity: Entity) => {
    const primaryContact = entity.contacts.find(c => c.status === "PRIMARY") || entity.contacts[0];
    return primaryContact;
  };

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
              <CardTitle>Gerenciamento de Entidades</CardTitle>
              <p className="text-gray-600 mt-1">Gerencie pessoas físicas e jurídicas</p>
            </div>
            <Button onClick={handleAddEntity}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Entidade
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar entidades..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="INDIVIDUAL">Pessoa Física</SelectItem>
                <SelectItem value="COMPANY">Pessoa Jurídica</SelectItem>
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

          {/* Entities Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome/Razão Social</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Nenhuma entidade encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  entities.map((entity) => {
                    const primaryContact = getPrimaryContact(entity);
                    return (
                      <TableRow key={entity.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {entity.name.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{entity.name}</p>
                              <p className="text-sm text-gray-500">#{entity.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {formatDocument(entity.document, entity.type)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(entity.type)}>
                            {getTypeLabel(entity.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {primaryContact && (
                            <div className="text-sm">
                              <p className="text-gray-900">{primaryContact.email || "Sem email"}</p>
                              <p className="text-gray-500">{primaryContact.mobile || primaryContact.phone || "Sem telefone"}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entity.isActive ? "default" : "secondary"}>
                            {entity.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {new Date(entity.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditEntity(entity)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditEntity(entity)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteEntity(entity)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {entities.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{entities.length}</span> entidade(s)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entity Modal */}
      <EntityModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        entity={editingEntity}
      />
    </div>
  );
}
