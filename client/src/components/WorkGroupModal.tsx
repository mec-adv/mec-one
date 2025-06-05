import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const workGroupSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type WorkGroupFormData = z.infer<typeof workGroupSchema>;

interface WorkGroup {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  userWorkGroups: Array<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

interface WorkGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workGroup?: WorkGroup | null;
}

export default function WorkGroupModal({ open, onOpenChange, workGroup }: WorkGroupModalProps) {
  const { toast } = useToast();
  const isEdit = !!workGroup;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<WorkGroupFormData>({
    resolver: zodResolver(workGroupSchema),
    defaultValues: {
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WorkGroupFormData) => {
      const response = await apiRequest("POST", "/api/work-groups", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-groups"] });
      toast({
        title: "Grupo criado",
        description: "O grupo de trabalho foi criado com sucesso.",
      });
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o grupo de trabalho.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: WorkGroupFormData) => {
      const response = await apiRequest("PUT", `/api/work-groups/${workGroup!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-groups"] });
      toast({
        title: "Grupo atualizado",
        description: "O grupo de trabalho foi atualizado com sucesso.",
      });
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o grupo de trabalho.",
        variant: "destructive",
      });
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (workGroup && open) {
      reset({
        name: workGroup.name,
        description: workGroup.description || "",
        isActive: workGroup.isActive,
      });
    } else if (!workGroup && open) {
      reset({
        name: "",
        description: "",
        isActive: true,
      });
    }
  }, [workGroup, open, reset]);

  const onSubmit = (data: WorkGroupFormData) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Grupo de Trabalho" : "Novo Grupo de Trabalho"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Digite o nome do grupo"
              {...register("name")}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o propósito e responsabilidades do grupo"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked as boolean)}
            />
            <Label htmlFor="isActive" className="text-sm font-medium">
              Grupo ativo
            </Label>
          </div>

          {isEdit && workGroup && workGroup.userWorkGroups.length > 0 && (
            <div className="space-y-2">
              <Label>Membros Atuais</Label>
              <div className="p-3 bg-muted rounded-lg">
                <div className="space-y-1">
                  {workGroup.userWorkGroups.map((userGroup) => (
                    <div key={userGroup.user.id} className="text-sm">
                      {userGroup.user.firstName} {userGroup.user.lastName} ({userGroup.user.email})
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {workGroup.userWorkGroups.length} {workGroup.userWorkGroups.length === 1 ? "membro" : "membros"}
                </p>
              </div>
            </div>
          )}

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
