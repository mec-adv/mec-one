import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const userSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().email("Email inválido"),
  profile: z.enum(["ADMINISTRATOR", "MANAGER", "COORDINATOR", "NEGOTIATOR", "LAWYER", "CONTROLLER"], {
    errorMap: () => ({ message: "Perfil é obrigatório" }),
  }),
  workGroupId: z.string().optional(),
  isActive: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profile: string;
  isActive: boolean;
  userWorkGroups: Array<{
    workGroup: {
      id: string;
      name: string;
    };
  }>;
}

interface WorkGroup {
  id: string;
  name: string;
  description?: string;
}

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

export default function UserModal({ open, onOpenChange, user }: UserModalProps) {
  const { toast } = useToast();
  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      isActive: true,
    },
  });

  // Load work groups for selection
  const { data: workGroups = [] } = useQuery<WorkGroup[]>({
    queryKey: ["/api/work-groups"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso.",
      });
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o usuário.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await apiRequest("PUT", `/api/users/${user!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso.",
      });
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (user && open) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profile: user.profile as any,
        workGroupId: user.userWorkGroups[0]?.workGroup.id || undefined,
        isActive: user.isActive,
      });
    } else if (!user && open) {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        profile: undefined,
        workGroupId: undefined,
        isActive: true,
      });
    }
  }, [user, open, reset]);

  const onSubmit = (data: UserFormData) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const profileOptions = [
    { value: "ADMINISTRATOR", label: "Administrador" },
    { value: "MANAGER", label: "Gerente" },
    { value: "COORDINATOR", label: "Coordenador" },
    { value: "NEGOTIATOR", label: "Negociador" },
    { value: "LAWYER", label: "Advogado" },
    { value: "CONTROLLER", label: "Controller" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome *</Label>
              <Input
                id="firstName"
                placeholder="Digite o nome"
                {...register("firstName")}
                className={errors.firstName ? "border-destructive" : ""}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome *</Label>
              <Input
                id="lastName"
                placeholder="Digite o sobrenome"
                {...register("lastName")}
                className={errors.lastName ? "border-destructive" : ""}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@exemplo.com"
              {...register("email")}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile">Perfil *</Label>
            <Select
              value={watch("profile")}
              onValueChange={(value) => setValue("profile", value as any)}
            >
              <SelectTrigger className={errors.profile ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                {profileOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.profile && (
              <p className="text-sm text-destructive">{errors.profile.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="workGroup">Grupo de Trabalho</Label>
            <Select
              value={watch("workGroupId") || ""}
              onValueChange={(value) => setValue("workGroupId", value || undefined)}
            >
              <SelectTrigger className={errors.workGroupId ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecione o grupo de trabalho" />
              </SelectTrigger>
              <SelectContent>
                {workGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.workGroupId && (
              <p className="text-sm text-destructive">{errors.workGroupId.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked as boolean)}
            />
            <Label htmlFor="isActive" className="text-sm font-medium">
              Usuário ativo
            </Label>
          </div>

          <div className="flex space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEdit ? "Atualizando..." : "Criando..."}
                </>
              ) : (
                isEdit ? "Atualizar" : "Criar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
