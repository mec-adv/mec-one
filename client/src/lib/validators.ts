import { z } from "zod";

// CPF validation
export function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, "");
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;
  
  return parseInt(cpf[9]) === digit1 && parseInt(cpf[10]) === digit2;
}

// CNPJ validation
export function isValidCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, "");
  
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]) * weights1[i];
  }
  let digit1 = sum % 11;
  digit1 = digit1 < 2 ? 0 : 11 - digit1;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]) * weights2[i];
  }
  let digit2 = sum % 11;
  digit2 = digit2 < 2 ? 0 : 11 - digit2;
  
  return parseInt(cnpj[12]) === digit1 && parseInt(cnpj[13]) === digit2;
}

// Document validation (CPF or CNPJ)
export function isValidDocument(document: string, type: "INDIVIDUAL" | "COMPANY"): boolean {
  if (type === "INDIVIDUAL") {
    return isValidCPF(document);
  } else {
    return isValidCNPJ(document);
  }
}

// Format CPF
export function formatCPF(cpf: string): string {
  cpf = cpf.replace(/[^\d]/g, "");
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Format CNPJ
export function formatCNPJ(cnpj: string): string {
  cnpj = cnpj.replace(/[^\d]/g, "");
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

// Format document based on type
export function formatDocument(document: string, type: "INDIVIDUAL" | "COMPANY"): string {
  if (type === "INDIVIDUAL") {
    return formatCPF(document);
  } else {
    return formatCNPJ(document);
  }
}

// Format phone number
export function formatPhone(phone: string): string {
  phone = phone.replace(/[^\d]/g, "");
  
  if (phone.length === 10) {
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  } else if (phone.length === 11) {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  
  return phone;
}

// Format CEP
export function formatCEP(cep: string): string {
  cep = cep.replace(/[^\d]/g, "");
  return cep.replace(/(\d{5})(\d{3})/, "$1-$2");
}

// Validation schemas
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const userSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().email("Email inválido"),
  profile: z.enum(["ADMINISTRATOR", "MANAGER", "COORDINATOR", "NEGOTIATOR", "LAWYER", "CONTROLLER"], {
    errorMap: () => ({ message: "Perfil é obrigatório" }),
  }),
  isActive: z.boolean().default(true),
});

export const workGroupSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const entitySchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY"], {
    errorMap: () => ({ message: "Tipo é obrigatório" }),
  }),
  name: z.string().min(1, "Nome/Razão Social é obrigatório"),
  document: z.string().min(1, "Documento é obrigatório"),
  municipalRegistration: z.string().optional(),
  stateRegistration: z.string().optional(),
  isActive: z.boolean().default(true),
}).refine((data) => {
  if (data.document) {
    return isValidDocument(data.document, data.type);
  }
  return true;
}, {
  message: "Documento inválido",
  path: ["document"],
});

export const addressSchema = z.object({
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
});

export const contactSchema = z.object({
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
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type WorkGroupFormData = z.infer<typeof workGroupSchema>;
export type EntityFormData = z.infer<typeof entitySchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
