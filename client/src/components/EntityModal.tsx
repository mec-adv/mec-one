import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDocument, isValidDocument } from "@/lib/validators";
import { Loader2, Plus, Minus } from "lucide-react";

const entitySchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY"], {
    errorMap: () => ({ message: "Tipo é obrigatório" }),
  }),
  name: z.string().min(1, "Nome/Razão Social é obrigatório"),
  document: z.string().min(1, "Documento é obrigatório"),
  municipalRegistration: z.string().optional(),
  stateRegistration: z.string().optional(),
  isActive: z.boolean().default(true),
  addresses: z.array(z.object({
    street: z.string().min(1, "Logradouro é obrigatório"),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().min(1, "Bairro é obrigatório"),
    zipCode: z.string().min(1, "CEP é obrigatório"),
    city: z.string().min(1, "Cidade é obrigatória"),
    state: z.string().min(2, "Estado é obrigatório").max(2, "Estado deve ter 2 caracteres"),
    country: z.string().default("Brasil"),
    isActive: z.boolean().default(true),
    isPrimary: z.boolean().default(false),
  })).optional(),
  contacts: z.array(z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    telegram: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    linkedin: z.string().optional(),
    status: z.enum(["ACTIVE", "PRIMARY", "INACTIVE"]).default("ACTIVE"),
  })).optional(),
}).refine((data) => {
  if (data.document) {
    return isValidDocument(data.document, data.type);
  }
  return true;
}, {
  message: "Documento inválido",
  path: ["document"],
});

type EntityFormData = z.infer<typeof entitySchema>;

interface Entity {
  id: string;
  type: "INDIVIDUAL" | "COMPANY";
  name: string;
  document: string;
  municipalRegistration?: string;
  stateRegistration?: string;
  isActive: boolean;
  addresses: Array<{
    id: string;
    street: string;
    number?: string;
    complement?: string;
    neighborhood: string;
    zipCode: string;
    city: string;
    state: string;
    country: string;
    isActive: boolean;
    isPrimary: boolean;
  }>;
  contacts: Array<{
    id: string;
    name?: string;
    role?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    telegram?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    status: string;
  }>;
}

interface EntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity?: Entity | null;
}

export default function EntityModal({ open, onOpenChange, entity }: EntityModalProps) {
  const { toast } = useToast();
  const isEdit = !!entity;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control,
  } = useForm<EntityFormData>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      isActive: true,
      addresses: [{}],
      contacts: [{}],
    },
  });

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control,
    name: "addresses",
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control,
    name: "contacts",
  });

  const entityType = watch("type");

  const createMutation = useMutation({
    mutationFn: async (data: EntityFormData) => {
      const payload = {
        entity: {
          type: data.type,
          name: data.name,
          document: data.document.replace(/[^\d]/g, ""), // Remove formatting
          municipalRegistration: data.municipalRegistration,
          stateRegistration: data.stateRegistration,
          isActive: data.isActive,
        },
        addresses: data.addresses || [],
        contacts: data.contacts?.map(contact => ({
          ...contact,
          email: contact.email || undefined, // Convert empty string to undefined
        })) || [],
      };
      
      const response = await apiRequest("POST", "/api/entities", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      toast({
        title: "Entidade criada",
        description: "A entidade foi criada com sucesso.",
      });
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a entidade.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EntityFormData) => {
      const payload = {
        entity: {
          type: data.type,
          name: data.name,
          document: data.document.replace(/[^\d]/g, ""), // Remove formatting
          municipalRegistration: data.municipalRegistration,
          stateRegistration: data.stateRegistration,
          isActive: data.isActive,
        },
        addresses: data.addresses || [],
        contacts: data.contacts?.map(contact => ({
          ...contact,
          email: contact.email || undefined, // Convert empty string to undefined
        })) || [],
      };
      
      const response = await apiRequest("PUT", `/api/entities/${entity!.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      toast({
        title: "Entidade atualizada",
        description: "A entidade foi atualizada com sucesso.",
      });
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a entidade.",
        variant: "destructive",
      });
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (entity && open) {
      reset({
        type: entity.type,
        name: entity.name,
        document: formatDocument(entity.document, entity.type),
        municipalRegistration: entity.municipalRegistration || "",
        stateRegistration: entity.stateRegistration || "",
        isActive: entity.isActive,
        addresses: entity.addresses.length > 0 ? entity.addresses : [{}],
        contacts: entity.contacts.length > 0 ? entity.contacts : [{}],
      });
    } else if (!entity && open) {
      reset({
        type: "INDIVIDUAL",
        name: "",
        document: "",
        municipalRegistration: "",
        stateRegistration: "",
        isActive: true,
        addresses: [{}],
        contacts: [{}],
      });
    }
  }, [entity, open, reset]);

  const onSubmit = (data: EntityFormData) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const brazilStates = [
    { value: "AC", label: "Acre" },
    { value: "AL", label: "Alagoas" },
    { value: "AP", label: "Amapá" },
    { value: "AM", label: "Amazonas" },
    { value: "BA", label: "Bahia" },
    { value: "CE", label: "Ceará" },
    { value: "DF", label: "Distrito Federal" },
    { value: "ES", label: "Espírito Santo" },
    { value: "GO", label: "Goiás" },
    { value: "MA", label: "Maranhão" },
    { value: "MT", label: "Mato Grosso" },
    { value: "MS", label: "Mato Grosso do Sul" },
    { value: "MG", label: "Minas Gerais" },
    { value: "PA", label: "Pará" },
    { value: "PB", label: "Paraíba" },
    { value: "PR", label: "Paraná" },
    { value: "PE", label: "Pernambuco" },
    { value: "PI", label: "Piauí" },
    { value: "RJ", label: "Rio de Janeiro" },
    { value: "RN", label: "Rio Grande do Norte" },
    { value: "RS", label: "Rio Grande do Sul" },
    { value: "RO", label: "Rondônia" },
    { value: "RR", label: "Roraima" },
    { value: "SC", label: "Santa Catarina" },
    { value: "SP", label: "São Paulo" },
    { value: "SE", label: "Sergipe" },
    { value: "TO", label: "Tocantins" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Entidade" : "Nova Entidade"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Dados Básicos */}
          <div className="form-section">
            <h4 className="form-section-title">Dados Básicos</h4>
            
            <div className="space-y-3">
              <Label>Tipo de Entidade *</Label>
              <RadioGroup
                value={entityType}
                onValueChange={(value) => setValue("type", value as "INDIVIDUAL" | "COMPANY")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="INDIVIDUAL" id="individual" />
                  <Label htmlFor="individual">Pessoa Física</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="COMPANY" id="company" />
                  <Label htmlFor="company">Pessoa Jurídica</Label>
                </div>
              </RadioGroup>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {entityType === "COMPANY" ? "Razão Social" : "Nome"} *
                </Label>
                <Input
                  id="name"
                  placeholder={entityType === "COMPANY" ? "Digite a razão social" : "Digite o nome"}
                  {...register("name")}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">
                  {entityType === "COMPANY" ? "CNPJ" : "CPF"} *
                </Label>
                <Input
                  id="document"
                  placeholder={entityType === "COMPANY" ? "00.000.000/0000-00" : "000.000.000-00"}
                  {...register("document")}
                  className={errors.document ? "border-destructive" : ""}
                />
                {errors.document && (
                  <p className="text-sm text-destructive">{errors.document.message}</p>
                )}
              </div>
            </div>

            {entityType === "COMPANY" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="municipalRegistration">Inscrição Municipal</Label>
                  <Input
                    id="municipalRegistration"
                    placeholder="Digite a inscrição municipal"
                    {...register("municipalRegistration")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stateRegistration">Inscrição Estadual</Label>
                  <Input
                    id="stateRegistration"
                    placeholder="Digite a inscrição estadual"
                    {...register("stateRegistration")}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Endereços */}
          <div className="form-section">
            <div className="flex items-center justify-between mb-4">
              <h4 className="form-section-title mb-0">Endereços</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendAddress({})}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Endereço
              </Button>
            </div>

            {addressFields.map((field, index) => (
              <div key={field.id} className="space-y-4 p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">Endereço {index + 1}</h5>
                  {addressFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAddress(index)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor={`addresses.${index}.street`}>Logradouro</Label>
                    <Input
                      placeholder="Rua, Avenida, etc."
                      {...register(`addresses.${index}.street` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`addresses.${index}.number`}>Número</Label>
                    <Input
                      placeholder="123"
                      {...register(`addresses.${index}.number` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`addresses.${index}.complement`}>Complemento</Label>
                    <Input
                      placeholder="Apto, Sala, etc."
                      {...register(`addresses.${index}.complement` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`addresses.${index}.neighborhood`}>Bairro</Label>
                    <Input
                      placeholder="Nome do bairro"
                      {...register(`addresses.${index}.neighborhood` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`addresses.${index}.zipCode`}>CEP</Label>
                    <Input
                      placeholder="00000-000"
                      {...register(`addresses.${index}.zipCode` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`addresses.${index}.city`}>Cidade</Label>
                    <Input
                      placeholder="Nome da cidade"
                      {...register(`addresses.${index}.city` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`addresses.${index}.state`}>Estado</Label>
                    <Select
                      value={watch(`addresses.${index}.state`)}
                      onValueChange={(value) => setValue(`addresses.${index}.state`, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {brazilStates.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contatos */}
          <div className="form-section">
            <div className="flex items-center justify-between mb-4">
              <h4 className="form-section-title mb-0">Contatos</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendContact({})}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Contato
              </Button>
            </div>

            {contactFields.map((field, index) => (
              <div key={field.id} className="space-y-4 p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">Contato {index + 1}</h5>
                  {contactFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContact(index)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`contacts.${index}.name`}>Nome do Contato</Label>
                    <Input
                      placeholder="Nome da pessoa"
                      {...register(`contacts.${index}.name` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contacts.${index}.role`}>Cargo/Função</Label>
                    <Input
                      placeholder="Cargo ou função"
                      {...register(`contacts.${index}.role` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contacts.${index}.phone`}>Telefone</Label>
                    <Input
                      placeholder="(11) 1234-5678"
                      {...register(`contacts.${index}.phone` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contacts.${index}.mobile`}>Celular</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      {...register(`contacts.${index}.mobile` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contacts.${index}.email`}>Email</Label>
                    <Input
                      type="email"
                      placeholder="contato@exemplo.com"
                      {...register(`contacts.${index}.email` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contacts.${index}.status`}>Status</Label>
                    <Select
                      value={watch(`contacts.${index}.status`)}
                      onValueChange={(value) => setValue(`contacts.${index}.status`, value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="PRIMARY">Principal</SelectItem>
                        <SelectItem value="INACTIVE">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked as boolean)}
            />
            <Label htmlFor="isActive" className="text-sm font-medium">
              Entidade ativa
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
